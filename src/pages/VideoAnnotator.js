import React, { useRef, useState, useEffect } from 'react';
import {ANNOTATION_STATE, MAX_LABELS, MIN_BOX_AREA} from "../utils/Constants";
import {
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    Typography,
    Stack,
    Box, Alert, IconButton, Collapse
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import {uploadTrial} from "../fetch/fetch";
import {useNavigate} from "react-router-dom";
import VideoRatingModal from "../components/VideoRatingModal";
import LabelSelector from "../components/LabelSelector";


const VideoAnnotator = (props) => {
    // labels

    const [selectedCategories, setSelectedCategories] = useState([]);
    const [customLabel, setCustomLabel] = useState('');
    const [labels, setLabels] = useState([]);

    const [showLabeledFrames, setShowLabeledFrames] = useState(true);
    const [showLabelPanel, setShowLabelPanel] = useState(true);

    const [boxTooSmallError, setBoxTooSmallError] = useState(false);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [currentLabel, setCurrentLabel] = useState(labels[0]);

    const [annotations, setAnnotations] = useState({});
    const [manualFrames, setManualFrames] = useState(new Map());
    // console.log(manualFrames)
    // for (const [frame, boxes] of Object.entries(annotations)) {
    //     const manualBoxes = boxes.filter(box => !box.interpolated);
    //     if (manualBoxes.length > 0) {
    //         console.log(`Frame ${frame}:`, manualBoxes);
    //     }
    // }
    const [drawing, setDrawing] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [draggingIndex, setDraggingIndex] = useState(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [history, setHistory] = useState([]);
    const [redoStack, setRedoStack] = useState([]);
    const [currentFrame, setCurrentFrame] = useState(0);
    const [error, setError] = useState(false);
    const [textError, setTextError] = useState(false);

    const [isPlaying, setIsPlaying] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const navigate = useNavigate();

    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [videoRating, setVideoRating] = useState(4);
    const [promptRating, setPromptRating] = useState(4);

    const [showRatingModal, setShowRatingModal] = useState(false);

    const formatLabel = (labelObj) => {
        const categoryStr = labelObj.categories.join(', ');
        return labelObj.text ? `${categoryStr} - ${labelObj.text}` : categoryStr;
    };

    const setHistoryFunction = () => {
        setHistory((prev) => [
            ...prev,
            {
                annotations: structuredClone(annotations),
                manualFrames: new Map(manualFrames),  // ✅ preserve both frame and label
                labels: structuredClone(labels),
                currentLabel: currentLabel ? structuredClone(currentLabel) : undefined,
            },
        ]);
    };

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

    const generateColors = (labelObjs) => {
        const baseColors = ['red', 'green', 'blue', 'orange', 'purple', 'cyan', 'magenta', 'lime', 'yellow', 'pink', 'brown', 'gray'];
        const labelColors = {};
        labelObjs.forEach((labelObj, index) => {
            const labelStr = formatLabel(labelObj);
            labelColors[labelStr] = baseColors[index % baseColors.length];
        });
        return labelColors;
    };

    const labelColorMap = generateColors(labels);

    const getCurrentFrame = () => {
        const video = videoRef.current;
        if (video){
            return Math.floor(video.currentTime * (video.frameRate || 30));
        } else {
            return 0
        }
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
                box.label === formatLabel(currentLabel) &&
                x >= box.x && x <= box.x + box.w &&
                y >= box.y && y <= box.y + box.h
            ) {
                boxes[index].interpolated = false;
                setManualFrames((prev) => {
                    const updated = new Map(prev);
                    const labelSet = new Set(updated.get(frame) || []);
                    labelSet.add(formatLabel(currentLabel));
                    updated.set(frame, labelSet);
                    return updated;
                });
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
            setHistoryFunction()

            setDraggingIndex(null);
            return;
        }

        if (!drawing) return;

        const { x: endX, y: endY } = getRelativeCoords(e);
        const width = Math.abs(startPos.x - endX);
        const height = Math.abs(startPos.y - endY);
        const area = width * height;

        if (area < MIN_BOX_AREA) {
            setBoxTooSmallError(true);
            setDrawing(false);
            return;
        }

        const newBox = {
            x: Math.min(startPos.x, endX),
            y: Math.min(startPos.y, endY),
            w: Math.abs(startPos.x - endX),
            h: Math.abs(startPos.y - endY),
            label: formatLabel(currentLabel),
            interpolated: false,
        };

        setBoxTooSmallError(false);
        setHistoryFunction()

        setAnnotations((prev) => {
            const updated = { ...prev };
            if (!updated[frame]) updated[frame] = [];

            // Only allow one box per label per frame
            updated[frame] = updated[frame].filter(box => box.label !== newBox.label);

            updated[frame].push(newBox);
            return updated;
        });

        setManualFrames((prev) => {
            const updated = new Map(prev);
            const labelSet = new Set(updated.get(frame) || []);
            labelSet.add(formatLabel(currentLabel));
            updated.set(frame, labelSet);
            return updated;
        });
        setDrawing(false);
    };

    const undo = () => {
        if (!history.length) return;
        const prev = history[history.length - 1];

        setRedoStack((r) => [...r, {
            annotations: structuredClone(annotations),
            manualFrames: new Map(manualFrames),
            labels: structuredClone(labels),
            currentLabel: currentLabel ? structuredClone(currentLabel) : undefined,
        }]);

        setAnnotations(prev.annotations);
        setManualFrames(new Map(prev.manualFrames));  // ✅ restore full map
        setLabels(prev.labels);
        setCurrentLabel(prev.currentLabel);
        setHistory((h) => h.slice(0, -1));
    };

    const redo = () => {
        if (!redoStack.length) return;
        const next = redoStack[redoStack.length - 1];

        setHistoryFunction();

        setAnnotations(next.annotations);
        setManualFrames(new Map(next.manualFrames));  // ✅ restore full map
        setLabels(next.labels);
        setCurrentLabel(next.currentLabel);
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
            promptRating: JSON.stringify(promptRating),
            videoHeight: JSON.stringify(dimensions.height),
            videoWidth: JSON.stringify(dimensions.width)
        };
        uploadTrial(request, props.setDidNetworkFail)
    }

    const handleDeleteLabel = (indexToDelete) => {
        setLabels((prevLabels) => {
            const deletedLabelObj = prevLabels[indexToDelete];
            const deletedLabelStr = formatLabel(deletedLabelObj);

            const updatedLabels = prevLabels.filter((_, i) => i !== indexToDelete);

            if (JSON.stringify(currentLabel) === JSON.stringify(deletedLabelObj)) {
                setCurrentLabel(updatedLabels[0] || undefined);
            }

            // Update annotations and manualFrames
            setAnnotations((prevAnnotations) => {
                const cleanedAnnotations = {};
                const updatedManualFrames = new Map();

                for (const [frameStr, boxes] of Object.entries(prevAnnotations)) {
                    const frame = Number(frameStr);

                    // Remove deleted label's boxes
                    const filteredBoxes = boxes.filter(box => box.label !== deletedLabelStr);
                    if (filteredBoxes.length > 0) {
                        cleanedAnnotations[frame] = filteredBoxes;
                    }

                    // Update manualFrames if label existed
                    const currentLabels = manualFrames.get(frame);
                    if (currentLabels && currentLabels.has(deletedLabelStr)) {
                        const newLabelSet = new Set(currentLabels);
                        newLabelSet.delete(deletedLabelStr);
                        if (newLabelSet.size > 0) {
                            updatedManualFrames.set(frame, newLabelSet);
                        }
                        // else: don't set the frame at all (it's now empty)
                    } else if (currentLabels) {
                        // Retain unchanged frame if label wasn't involved
                        updatedManualFrames.set(frame, currentLabels);
                    }
                }

                setManualFrames(updatedManualFrames);
                return cleanedAnnotations;
            });

            return updatedLabels;
        });

        setHistoryFunction();
    };

    // ***** LABEL STUFF ******
    const seekToFrame = (offset) => {
        const video = videoRef.current;
        const fps = video.frameRate || 30;
        if (video){
            video.currentTime = Math.max(0, video.currentTime + offset / fps);
        }
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
        const labelToFrames = {};

        for (const [frame, labelSet] of manualFrames.entries()) {
            for (const label of labelSet) {
                if (!labelToFrames[label]) labelToFrames[label] = [];
                labelToFrames[label].push(frame);
            }
        }

        // Sort each label's list of frames
        for (const label in labelToFrames) {
            labelToFrames[label].sort((a, b) => a - b);
        }

        // Step 1: Clean up stale interpolated boxes
        setAnnotations((prev) => {
            const cleaned = { ...prev };

            for (const [frameStr, boxes] of Object.entries(cleaned)) {
                const frame = Number(frameStr);

                cleaned[frame] = boxes.filter((box) => {
                    if (!box.interpolated) return true;

                    const label = box.label;
                    const frames = labelToFrames[label] || [];

                    // Must have at least 2 manual anchors to interpolate
                    if (frames.length < 2) return false;

                    // Remove if outside interpolation range
                    if (frame <= frames[0] || frame >= frames[frames.length - 1]) return false;

                    return true;
                });

                // Only delete the frame if it became empty AND it's not a manual frame
                if (cleaned[frame].length === 0 && !manualFrames.has(frame)) {
                    delete cleaned[frame];
                }
            }

            // Step 2: Recompute interpolated boxes from current anchors
            const newInterpolated = {};
            for (const label in labelToFrames) {
                const frames = labelToFrames[label];

                for (let i = 0; i < frames.length - 1; i++) {
                    const from = frames[i];
                    const to = frames[i + 1];

                    const fromBoxes = cleaned[from]?.filter(b => b.label === label && !b.interpolated) || [];
                    const toBoxes = cleaned[to]?.filter(b => b.label === label && !b.interpolated) || [];

                    if (fromBoxes.length > 0 && toBoxes.length > 0) {
                        Object.assign(newInterpolated, interpolateBoxes(from, to, fromBoxes, toBoxes));
                    }
                }
            }

            // Step 3: Merge new interpolated boxes
            for (const [frameStr, interpBoxes] of Object.entries(newInterpolated)) {
                const frame = Number(frameStr);
                const existing = cleaned[frame] || [];

                const interpLabels = new Set(interpBoxes.map(box => box.label));
                const nonMatching = existing.filter(
                    (box) => !box.interpolated || !interpLabels.has(box.label)
                );

                cleaned[frame] = [...nonMatching, ...interpBoxes];
            }

            return cleaned;
        });
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
                            cursor: currentLabel === undefined ? 'not-allowed' : 'crosshair',
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
                <Typography variant="body2" style={{ minWidth: 100 }}>
                    Video prompt: {props.videoPrompt}
                </Typography>
                {boxTooSmallError && (
                    <Alert severity="warning" sx={{ mt: 1 }}>
                        Bounding box too small (min {MIN_BOX_AREA} px²). Please draw a larger box.
                    </Alert>
                )}
            </div>
            <div style={{
                position: 'absolute',
                right: 20,
                top: 0,
                bottom: 100,
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
                        <Typography style={{ margin: '0 0 8px 0' }}>Labeled Frames</Typography>

                        {Object.entries(
                            Array.from(manualFrames.entries())
                                .flatMap(([frame, labelSet]) =>
                                    [...labelSet].map(label => ({ frame, label }))
                                )
                                .reduce((acc, { frame, label }) => {
                                    if (!acc[label]) acc[label] = [];
                                    acc[label].push(frame);
                                    return acc;
                                }, {})
                        )
                            .sort(([aLabel], [bLabel]) => aLabel.localeCompare(bLabel))
                            .map(([label, frames]) => (
                                <div key={label} style={{ marginBottom: '10px' }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                                        {label}
                                    </Typography>
                                    {frames
                                        .sort((a, b) => a - b)
                                        .map((frame) => (
                                            <div key={`${frame}-${label}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                <Button
                                                    style={{ background: 'none', border: 'none', color: 'blue', cursor: 'pointer' }}
                                                    onClick={() => {
                                                        const video = videoRef.current;
                                                        const fps = video.frameRate || 30;
                                                        if (video) {
                                                            video.currentTime = frame / fps;
                                                        }
                                                    }}
                                                >
                                                    Frame {frame}
                                                </Button>
                                                <Button
                                                    style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer' }}
                                                    onClick={() => {
                                                        setHistoryFunction();

                                                        const updatedManualFrames = new Map(manualFrames);
                                                        const labelSet = new Set(updatedManualFrames.get(frame));
                                                        labelSet.delete(label);
                                                        if (labelSet.size === 0) {
                                                            updatedManualFrames.delete(frame);
                                                        } else {
                                                            updatedManualFrames.set(frame, labelSet);
                                                        }
                                                        setManualFrames(updatedManualFrames);

                                                        setAnnotations((prev) => {
                                                            const updated = { ...prev };
                                                            const filtered = (updated[frame] || []).filter(
                                                                (box) => !(box.label === label && !box.interpolated)
                                                            );
                                                            if (filtered.length > 0) {
                                                                updated[frame] = filtered;
                                                            } else {
                                                                delete updated[frame];
                                                            }
                                                            return updated;
                                                        });
                                                    }}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        ))}
                                </div>
                            ))}
                    </div>
                )}
            </div>
            <div style={{
                position: 'absolute',
                bottom: 10, left: 10, zIndex: 20, backgroundColor: 'rgba(255, 255, 255, 0.85)',
                padding: '8px' }}>
                <IconButton
                    size="small"
                    onClick={() => setShowLabelPanel(prev => !prev)}
                    sx={{ alignSelf: 'flex-start', mb: 1 }}
                >
                    {showLabelPanel ? <ExpandMoreIcon /> : <ExpandLessIcon />}
                    <Typography>
                        {showLabelPanel ? "Hide Label Manager" : "Show Label Manager"}
                    </Typography>
                </IconButton>
                <Collapse in={showLabelPanel} orientation="vertical">
                    <Box display="flex"
                         justifyContent="center"
                         alignItems="center" sx={{ width: '100%', p: 2 , flexDirection: 'column',}}>
                        {showLabelPanel && (
                            <>
                                <LabelSelector
                                    selectedCategories={selectedCategories}
                                    setCustomLabel={setCustomLabel}
                                    customLabel={customLabel}
                                    setLabels={setLabels}
                                    labels={labels}
                                    setSelectedCategories={setSelectedCategories}
                                    handleDeleteLabel={handleDeleteLabel}
                                    setError={setError}
                                    setCurrentLabel={setCurrentLabel}
                                    setHistoryFunction={setHistoryFunction}
                                    setTextError={setTextError}
                                />
                                {error && (
                                    <Alert severity="error" sx={{ mt: 2 }}>
                                        Maximum of {MAX_LABELS} labels allowed.
                                    </Alert>
                                )}
                                {textError && (
                                    <Alert severity="error" sx={{ mt: 1 }}>
                                        Please input a text description and category for the label.
                                    </Alert>
                                )}
                            </>
                        )}
                    </Box>
                </Collapse>
            </div>
            <div style={{ position: 'absolute', bottom: 10, right: 10, zIndex: 10, backgroundColor: '#fff8', padding: '8px' }}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel id="label-select">Label</InputLabel>
                    <Select
                        labelId="label-select"
                        id="label-select-dropdown"
                        value={currentLabel ? JSON.stringify(currentLabel) : ''}
                        label="Label"
                        onChange={(e) => {
                            const selected = JSON.parse(e.target.value);
                            setCurrentLabel(selected);
                        }}
                        variant="filled"
                    >
                        {labels.map((labelObj, index) => (
                            <MenuItem key={index} value={JSON.stringify(labelObj)}>
                                {formatLabel(labelObj)}
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
                    setShowRatingModal(true)
                }} style={{ marginLeft: 5 }}>Submit</Button>
            </div>
            <VideoRatingModal showRatingModal={showRatingModal}
                              setVideoRating={setVideoRating}
                              setShowRatingModal={setShowRatingModal}
                              onClickFunction={()=> {
                                  submitAnnotationsToDB()
                                  props.setAnnotationState(ANNOTATION_STATE.WAITING_PAGE_FOR_NEXT)
                              }}
                              videoPrompt={props.videoPrompt}
                              setPromptRating={setPromptRating}
            />
        </div>
    );
};

export default VideoAnnotator;
