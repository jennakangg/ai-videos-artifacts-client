import React, { useRef, useState, useEffect } from 'react';
import {ANNOTATION_STATE} from "../utils/Constants";
import { FormControl, InputLabel, Select, MenuItem, Button} from '@mui/material';
import {uploadTrial} from "../fetch/fetch";

const VIDEO_PLAYER_BOTTOM_OFFSET = 70
const VideoAnnotator = (props) => {
    let labels = props.labels
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [currentLabel, setCurrentLabel] = useState(labels[0]);
    const [annotations, setAnnotations] = useState({});
    const [manualFrames, setManualFrames] = useState(new Set());
    const [drawing, setDrawing] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [draggingIndex, setDraggingIndex] = useState(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [history, setHistory] = useState([]);
    const [redoStack, setRedoStack] = useState([]);
    const [currentFrame, setCurrentFrame] = useState(0);

    const generateColors = (labels) => {
        const baseColors = ['red', 'green', 'blue', 'orange', 'purple', 'cyan', 'magenta', 'lime', 'yellow', 'pink', 'brown', 'gray'];
        const labelColors = {};
        labels.forEach((label, index) => {
            // Wrap around if there are more labels than base colors
            labelColors[label] = baseColors[index % baseColors.length];
        });
        return labelColors;
    };

    const labelColorMap = generateColors(labels);

    const getCurrentFrame = () => {
        const video = videoRef.current;
        return Math.floor(video.currentTime * (video.frameRate || 30));
    };

    const getRelativeCoords = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: ((e.clientX - rect.left) / rect.width) * videoRef.current.videoWidth,
            y: ((e.clientY - rect.top) / rect.height) * videoRef.current.videoHeight,
        };
    };

    const drawBoxes = (customAnnotations = annotations) => {
        const ctx = canvasRef.current.getContext('2d');
        const frame = getCurrentFrame();
        const boxes = customAnnotations[frame] || [];

        const scaleX = canvasRef.current.width / videoRef.current.videoWidth;
        const scaleY = canvasRef.current.height / videoRef.current.videoHeight;

        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        boxes.forEach((box) => {
            const x = box.x * scaleX;
            const y = box.y * scaleY;
            const w = box.w * scaleX;
            const h = box.h * scaleY;

            ctx.strokeStyle = labelColorMap[box.label] || 'black';
            ctx.lineWidth = 2;
            if (box.interpolated) ctx.setLineDash([4, 4]);
            ctx.strokeRect(x, y, w, h);
            ctx.setLineDash([]);
            ctx.font = '16px Arial';
            ctx.fillStyle = ctx.strokeStyle;
            ctx.fillText(box.label, x + 4, y + 16);
        });
    };

    const interpolateBoxes = (fromFrame, toFrame, fromBoxes, toBoxes) => {
        const result = {};
        const steps = toFrame - fromFrame;

        // Create a map of boxes by label
        const fromMap = {};
        const toMap = {};
        fromBoxes.forEach(box => { fromMap[box.label] = box });
        toBoxes.forEach(box => { toMap[box.label] = box });

        // Interpolate only for matching labels
        for (const label in fromMap) {
            if (!(label in toMap)) continue;

            const from = fromMap[label];
            const to = toMap[label];

            for (let i = 1; i < steps; i++) {
                const t = i / steps;
                const frame = fromFrame + i;
                if (!result[frame]) result[frame] = [];
                result[frame].push({
                    x: from.x + (to.x - from.x) * t,
                    y: from.y + (to.y - from.y) * t,
                    w: from.w + (to.w - from.w) * t,
                    h: from.h + (to.h - from.h) * t,
                    label: label,
                    interpolated: true,
                });
            }
        }

        return result;
    };

    const handleMouseDown = (e) => {
        const { x, y } = getRelativeCoords(e);
        const frame = getCurrentFrame();
        const boxes = annotations[frame] || [];

        for (let index = boxes.length - 1; index >= 0; index--) {
            const box = boxes[index];
            if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) {
                boxes[index].interpolated = false;
                manualFrames.add(frame);
                setDraggingIndex(index);
                setDragOffset({ x: x - box.x, y: y - box.y });
                return;
            }
        }

        setStartPos({ x, y });
        setDrawing(true);
    };

    const handleMouseMove = (e) => {
        const { x, y } = getRelativeCoords(e);
        const frame = getCurrentFrame();
        const updated = { ...annotations };

        if (draggingIndex !== null) {
            const box = updated[frame][draggingIndex];
            box.x = x - dragOffset.x;
            box.y = y - dragOffset.y;
            drawBoxes(updated);
            return;
        }

        if (drawing) {
            drawBoxes(updated);
            const ctx = canvasRef.current.getContext('2d');
            const scaleX = canvasRef.current.width / videoRef.current.videoWidth;
            const scaleY = canvasRef.current.height / videoRef.current.videoHeight;

            const x0 = startPos.x * scaleX;
            const y0 = startPos.y * scaleY;
            const x1 = x * scaleX;
            const y1 = y * scaleY;

            ctx.setLineDash([2, 2]);
            ctx.strokeStyle = labelColorMap[currentLabel] || 'black';
            ctx.lineWidth = 2;
            ctx.strokeRect(
                Math.min(x0, x1),
                Math.min(y0, y1),
                Math.abs(x1 - x0),
                Math.abs(y1 - y0)
            );
            ctx.setLineDash([]);
        }
    };

    const handleMouseUp = (e) => {
        const frame = getCurrentFrame();

        if (draggingIndex !== null) {
            setHistory((prev) => [...prev, structuredClone(annotations)]);
            setDraggingIndex(null);
            return;
        }

        if (!drawing) return;

        const { x: endX, y: endY } = getRelativeCoords(e);
        const newBox = {
            x: Math.min(startPos.x, endX),
            y: Math.min(startPos.y, endY),
            w: Math.abs(startPos.x - endX),
            h: Math.abs(startPos.y - endY),
            label: currentLabel,
            interpolated: false,
        };

        setHistory((prev) => [...prev, structuredClone(annotations)]);
        setAnnotations((prev) => {
            const updated = { ...prev };
            if (!updated[frame]) updated[frame] = [];

            // Only allow one box per label per frame
            updated[frame] = updated[frame].filter(box => box.label !== newBox.label);

            updated[frame].push(newBox);
            return updated;
        });

        setManualFrames(new Set(manualFrames).add(frame));
        setDrawing(false);
    };

    const undo = () => {
        if (!history.length) return;
        const prev = history[history.length - 1];
        setRedoStack((r) => [...r, structuredClone(annotations)]);
        setAnnotations(prev);
        setHistory((h) => h.slice(0, -1));
    };

    const redo = () => {
        if (!redoStack.length) return;
        const next = redoStack[redoStack.length - 1];
        setHistory((h) => [...h, structuredClone(annotations)]);
        setAnnotations(next);
        setRedoStack((r) => r.slice(0, -1));
    };

    const exportAnnotations = () => {
        const video = videoRef.current;
        const fps = video.frameRate || 30;

        const exportData = Object.entries(annotations).flatMap(([frameStr, boxes]) => {
            const frame = parseInt(frameStr, 10);
            const time = frame / fps;

            return boxes.map((box) => ({
                time: parseFloat(time.toFixed(3)), // seconds, to 3 decimal places
                frame,
                label: box.label,
                x: box.x,
                y: box.y,
                w: box.w,
                h: box.h,
                interpolated: box.interpolated || false,
            }));
        });

        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'annotations_with_timestamps.json';
        a.click();
        URL.revokeObjectURL(a.href);
    };

    const submitAnnotationsToDB = () => {
        const video = videoRef.current;
        const fps = video.frameRate || 30;
        const exportData = Object.entries(annotations).flatMap(([frameStr, boxes]) => {
        const frame = parseInt(frameStr, 10);
        const time = frame / fps;

        return boxes.map((box) => ({
            time: parseFloat(time.toFixed(3)), // seconds
            frame,
            label: box.label,
            x: box.x,
            y: box.y,
            w: box.w,
            h: box.h,
            interpolated: box.interpolated || false,
        }));
        });

        const timestamp = new Date().toISOString();
        const userID = props.userID
        const videoID = props.videoID

        const userVideoAnnotationID = `${userID}_${videoID}_${timestamp}`;

        const request = {
            userTrialID: userVideoAnnotationID,
            userID: userID,
            videoID: videoID,
            timestamp: timestamp,
            annotation: JSON.stringify(exportData),
            labels: JSON.stringify(labels),
        };

        uploadTrial(request, props.setDidNetworkFail)
    }


    const seekToFrame = (offset) => {
        const video = videoRef.current;
        const fps = video.frameRate || 30;
        video.currentTime = Math.max(0, video.currentTime + offset / fps);
    };

    useEffect(() => {
        const interval = setInterval(() => {
            const frame = getCurrentFrame();
            setCurrentFrame(frame);
            drawBoxes();
        }, 100);
        return () => clearInterval(interval);
    }, [annotations]);

    useEffect(() => {
        if (manualFrames.size < 2) return;

        const sorted = [...manualFrames].sort((a, b) => a - b);
        const interpolated = {};

        for (let i = 0; i < sorted.length - 1; i++) {
            const from = sorted[i], to = sorted[i + 1];
            if (annotations[from] && annotations[to]) {
                Object.assign(interpolated, interpolateBoxes(from, to, annotations[from], annotations[to]));
            }
        }

        setAnnotations((prev) => ({ ...prev, ...interpolated }));
    }, [manualFrames]);

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
                <video
                    id="annotationVideo"
                    ref={videoRef}
                    controls
                    controlsList="nodownload noplaybackrate nofullscreen noremoteplayback"
                    disablePictureInPicture
                    muted
                    autoPlay
                    onLoadedMetadata={() => {
                        const video = videoRef.current;
                        const canvas = canvasRef.current;
                        if (video && canvas) {
                            canvas.width = video.offsetWidth;
                            canvas.height = video.offsetHeight - VIDEO_PLAYER_BOTTOM_OFFSET; // Make room for controls
                        }
                    }}
                    onTimeUpdate={drawBoxes}
                    style={{ display: 'block' }}
                >
                    <source id="annotationVideoSrc" type="video/mp4"
                            src={props.videoSrc}
                    ></source>
                </video>
                <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        pointerEvents: 'auto',
                        // zIndex: 1,
                        // background:"black",
                        height: `${videoRef.current?.offsetHeight - VIDEO_PLAYER_BOTTOM_OFFSET}px`
                    }}
                />
            </div>
            <div style={{ position: 'absolute', bottom: 10, right: 10, zIndex: 10, backgroundColor: '#fff8', padding: '8px' }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel id="label-select">Label</InputLabel>
                    <Select
                        labelId="label-select"
                        id="label-select-dropdown"
                        value={currentLabel}
                        label="Label"
                        onChange={(e) => setCurrentLabel(e.target.value)}
                    >
                        {labels.map((label) => (
                            <MenuItem key={label} value={label}>
                                {label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <Button onClick={undo} style={{ marginLeft: 10 }}>Undo</Button>
                <Button onClick={redo} style={{ marginLeft: 5 }}>Redo</Button>
                {/*<Button onClick={exportAnnotations} style={{ marginLeft: 5 }}>Export</Button>*/}
                <Button onClick={() => seekToFrame(-1)} style={{ marginLeft: 10 }}>Prev Frame</Button>
                <Button onClick={() => seekToFrame(1)} style={{ marginLeft: 5 }}>Next Frame</Button>
                <Button onClick={() => {
                    submitAnnotationsToDB()
                    props.setAnnotationState(ANNOTATION_STATE.WAITING_PAGE_FOR_NEXT)
                }}
                        style={{ marginLeft: 5 }}>Submit</Button>
            </div>
        </div>
    );
};

export default VideoAnnotator;
