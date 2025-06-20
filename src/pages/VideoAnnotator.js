import React, { useRef, useState, useEffect } from 'react';
import {ANNOTATION_STATE, MAX_LABELS} from "../utils/Constants";
import {
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    Typography,
    Stack,
    TextField,
    Chip,
    Box, Alert, IconButton
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import {uploadTrial} from "../fetch/fetch";
import {useNavigate} from "react-router-dom";

const VideoAnnotator = (props) => {
    // labels
    const [input, setInput] = useState('');
    const [labels, setLabels] = useState(props.labels)
    const [showLabeledFrames, setShowLabeledFrames] = useState(true);

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
    const [error, setError] = useState(false);

    const [isPlaying, setIsPlaying] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const navigate = useNavigate();
    let videoRating = props.videoRating;
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const handleLoadedMetadata = () => {
            if (videoRef.current) {
                setDimensions({
                    width: videoRef.current.videoWidth,
                    height: videoRef.current.videoHeight,
                });
            }
        };

        const videoEl = videoRef.current;
        if (videoEl) {
            videoEl.addEventListener("loadedmetadata", handleLoadedMetadata);
        }

        return () => {
            if (videoEl) {
                videoEl.removeEventListener("loadedmetadata", handleLoadedMetadata);
            }
        };
    }, []);

    useEffect(() => {
        if (!props.userID) {
            navigate('/login'); // or whatever fallback route you want
        }
    }, [props.userID, navigate]);

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

        // map boxes by label
        const fromMap = {};
        const toMap = {};
        fromBoxes.forEach(box => { fromMap[box.label] = box });
        toBoxes.forEach(box => { toMap[box.label] = box });

        // only interpolate for things with same label
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

        const video = videoRef.current;
        video.pause();

        const { x, y } = getRelativeCoords(e);
        const frame = getCurrentFrame();
        const boxes = annotations[frame] || [];

        for (let index = boxes.length - 1; index >= 0; index--) {
            const box = boxes[index];
            if (
                box.label === currentLabel &&
                x >= box.x && x <= box.x + box.w &&
                y >= box.y && y <= box.y + box.h
            ) {
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
            setHistory((prev) => [...prev, {
                annotations: structuredClone(annotations),
                manualFrames: new Set(manualFrames)
            }]);
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

        setHistory((prev) => [...prev, {
            annotations: structuredClone(annotations),
            manualFrames: new Set(manualFrames)
        }]);
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

        setRedoStack((r) => [...r, {
            annotations: structuredClone(annotations),
            manualFrames: new Set(manualFrames),
        }]);

        setAnnotations(prev.annotations);
        setManualFrames(new Set(prev.manualFrames));
        setHistory((h) => h.slice(0, -1));
    };


    const redo = () => {
        if (!redoStack.length) return;
        const next = redoStack[redoStack.length - 1];

        setHistory((h) => [...h, {
            annotations: structuredClone(annotations),
            manualFrames: new Set(manualFrames),
        }]);

        setAnnotations(next.annotations);
        setManualFrames(new Set(next.manualFrames));
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
            videoRating: JSON.stringify(videoRating),
            videoHeight: JSON.stringify(dimensions.height),
            videoWidth: JSON.stringify(dimensions.width)
        };

        uploadTrial(request, props.setDidNetworkFail)
    }

    // ***** LABEL STUFF ******
    const handleAddLabel = () => {
        const trimmed = input.trim();
        if (trimmed && !labels.includes(trimmed) && labels.length <= MAX_LABELS) {
            setLabels(prev => [...prev, trimmed]);
        }
        setInput('');
    };

    const handleDelete = (labelToDelete) => {
        setLabels(prev => prev.filter(label => label !== labelToDelete));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddLabel();
        }
    };
    // ***** LABEL STUFF ******


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

    useEffect(() => {
        const handleKeyDown = (e) => {
            const activeTag = document.activeElement.tagName.toLowerCase();
            if (e.code === 'Space' && activeTag !== 'input' && activeTag !== 'textarea') {
                e.preventDefault();
                const video = videoRef.current;
                if (video.paused) {
                    video.play();
                    setIsPlaying(true);
                } else {
                    video.pause();
                    setIsPlaying(false);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // custom video controller
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => setCurrentTime(video.currentTime);
        const handleLoadedMetadata = () => setDuration(video.duration);
        const handleEnded = () => {
            setIsPlaying(false);
        }

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('ended', handleEnded);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('ended', handleEnded);
        };
    }, []);

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
        }}>
            <div style={{
                width: '100vw',
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center' }}>
                <div style={{ display: 'flex', position: 'relative' }}>
                    <video
                        ref={videoRef}
                        controls={false}
                        muted
                        autoPlay
                        onLoadedMetadata={() => {
                            const video = videoRef.current;
                            const canvas = canvasRef.current;
                            if (video && canvas) {
                                canvas.width = video.offsetWidth;
                                canvas.height = video.offsetHeight;
                            }
                        }}
                        onTimeUpdate={drawBoxes}
                        style={{ display: 'block', maxWidth: '100%', maxHeight: '60vh' }}
                    >
                        <source id="annotationVideoSrc" type="video/mp4" src={props.videoSrc} />
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
                            pointerEvents: labels.length === 0 ? 'none' : 'auto',
                            cursor: labels.length === 0 ? 'not-allowed' : 'crosshair',
                            // backgroundColor: "#000000"
                        }}
                    />
                </div>
                {/* Custom controller bar directly underneath the video */}
                <div style={{
                    width: '100%',
                    maxWidth: '960px',
                    marginTop: '8px',
                    padding: '10px',
                    backgroundColor: '#fff8',
                    borderRadius: '8px'
                }}>
                    <Stack direction="row" alignItems="center" spacing={2} style={{ width: '100%' }}>
                        <IconButton
                            variant="contained"
                            onClick={() => {
                                const video = videoRef.current;
                                if (video.paused) {
                                    video.play();
                                    setIsPlaying(true);
                                } else {
                                    video.pause();
                                    setIsPlaying(false);
                                }
                            }}
                        >   {isPlaying ? <PauseIcon/> : <PlayArrowIcon/>}
                        </IconButton>
                        <input
                            type="range"
                            min={0}
                            max={duration}
                            step={1 / (videoRef.current?.frameRate || 30)}  // 1 frame step
                            value={currentTime}
                            onChange={(e) => {
                                const time = parseFloat(e.target.value);
                                setCurrentTime(time); // update state
                                videoRef.current.currentTime = time; // jump video to slider pos
                            }}
                            style={{ flexGrow: 1 }}
                        />
                        <Typography variant="body2" style={{ minWidth: 100 }}>
                            {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
                        </Typography>
                    </Stack>
                </div>
            </div>
            <div style={{
                position: 'absolute',
                right: 20,
                top: 0,
                bottom: 0,
                width: showLabeledFrames ? '260px' : '40px', // expands/collapses width
                transition: 'width 0.3s ease',
                zIndex: 10,
                backgroundColor: '#fff8',
                display: 'flex',
                flexDirection: 'column',
                borderLeft: '1px solid #ccc'
            }}>
                {/* Chevron toggle button */}
                <IconButton
                    onClick={() => setShowLabeledFrames(prev => !prev)}
                    size="small"
                    sx={{ alignSelf: 'flex-start', mt: 1, ml: 1 }}
                >
                    {showLabeledFrames ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                    <Typography>
                        {showLabeledFrames ? "Hide Labeled Frames" : ""}
                    </Typography>
                </IconButton>
                {showLabeledFrames && (
                    <div style={{ overflowY: 'auto', padding: '10px' }}>
                    <Typography
                        style={{ margin: '0 0 8px 0' }}
                    >Labeled Frames</Typography>
                    {[...manualFrames].sort((a, b) => a - b).map((frame) => (
                        <div key={frame}
                             style={{ display: 'flex',
                                 justifyContent: 'space-between',
                                 alignItems: 'center',
                                 marginBottom: '4px'
                        }}>
                            <Button
                                style={{ background: 'none', border: 'none', color: 'blue', cursor: 'pointer' }}
                                onClick={() => {
                                    const video = videoRef.current;
                                    const fps = video.frameRate || 30;
                                    video.currentTime = frame / fps;
                                }}
                            >
                                {frame}
                            </Button>
                            <Button
                                style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer' }}
                                onClick={() => {
                                    setHistory((prev) => [
                                        ...prev,
                                        {
                                            annotations: structuredClone(annotations),
                                            manualFrames: new Set(manualFrames),
                                        },
                                    ]);

                                    setAnnotations((prevAnnotations) => {
                                        const updated = { ...prevAnnotations };

                                        const remainingBoxes = updated[frame]?.filter((box) => box.label !== currentLabel);
                                        if (remainingBoxes && remainingBoxes.length > 0) {
                                            updated[frame] = remainingBoxes;
                                        } else {
                                            delete updated[frame];
                                        }

                                        const updatedManualFrames = new Set(manualFrames);
                                        if (!remainingBoxes || remainingBoxes.length === 0) {
                                            updatedManualFrames.delete(frame);
                                        }

                                        const sorted = [...updatedManualFrames].sort((a, b) => a - b);
                                        const frameIndex = sorted.findIndex((f) => f > frame);
                                        const prevNeighbor = sorted[frameIndex - 1];
                                        const nextNeighbor = sorted[frameIndex];

                                        const cleaned = {};
                                        for (const f of updatedManualFrames) {
                                            cleaned[f] = updated[f];
                                        }

                                        for (let f = prevNeighbor + 1; f < nextNeighbor; f++) {
                                            if (updated[f]?.every((box) => box.interpolated)) {
                                                delete cleaned[f];
                                            }
                                        }

                                        let reinterpolated = {};
                                        if (
                                            prevNeighbor !== undefined &&
                                            nextNeighbor !== undefined &&
                                            cleaned[prevNeighbor] &&
                                            cleaned[nextNeighbor]
                                        ) {
                                            reinterpolated = interpolateBoxes(
                                                prevNeighbor,
                                                nextNeighbor,
                                                cleaned[prevNeighbor],
                                                cleaned[nextNeighbor]
                                            );
                                        }

                                        // Also update manualFrames safely
                                        setManualFrames(updatedManualFrames);

                                        return { ...cleaned, ...reinterpolated };
                                    });
                                }}

                            >
                                Delete
                            </Button>
                        </div>
                    ))}
                </div>
                )}
            </div>
            <div style={{
                position: 'absolute',
                bottom: 10, left: 10, zIndex: 10, backgroundColor: '#fff8', padding: '8px' }}>
                <Box display="flex"
                     justifyContent="center"
                     alignItems="center" sx={{ width: '100%', p: 2 , flexDirection: 'column',}}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <TextField
                            label="Enter label"
                            variant="outlined"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        <Button variant="contained" onClick={handleAddLabel} disabled={labels.length >= MAX_LABELS}>
                            Add
                        </Button>
                    </Stack>
                    <Stack direction="row" spacing={1} mt={2} flexWrap="wrap">
                        {labels.map((label, index) => (
                            <Chip
                                key={index}
                                label={label}
                                onDelete={() => handleDelete(label)}
                                sx={{ m: 0.5 }}
                            />
                        ))}
                    </Stack>
                    {error && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            Maximum of {MAX_LABELS} labels allowed.
                        </Alert>
                    )}
                </Box>
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
