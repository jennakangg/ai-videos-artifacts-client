import {Box, Button, CircularProgress, Container, Typography} from "@mui/material";
import React, {useEffect, useRef, useState} from "react";
import {Navigate} from "react-router-dom";
import {getVideosForBlock, uploadEvent} from "../fetch/fetch";
import {ANNOTATION_STATE} from "../utils/Constants";
import VideoContainer from "../components/VideoContainer";
import InputLabels from "../components/InputLabels";
import VideoAnnotator from "./VideoAnnotator";
import { useNavigate } from 'react-router-dom';

const AnnotationManager = (props) => {
    const navigate = useNavigate();

    const [didNetworkFail, setDidNetworkFail] = useState(false)
    const [annotationState, setAnnotationState] = useState(props.annotationState)

    const [didComplete, setDidComplete] = useState(false)

    let userID = props.userID
    console.log(userID)
    let videoIDs = props.videoIDs

    const currVideoData = useRef()
    const currentIndexInBlock = useRef(0)
    // load first block on first load
    const currentBlock = useRef(0)
    const labels = useRef([])
    const videoRating = useRef([])
    const loading = useRef(true)
    const [canStartNextBlock, setCanStartNextBlock] = useState(false)
    const currentVideos = useRef([])
    const cachedNextVideosBytes = useRef([])
    const [videoCounterProgress, setVideoCounterProgress] = useState(0)
    const [totalVideos, setTotalVideos] = useState(0)

    const loadingRetries = useRef(0);

    useEffect(() => {
        if (!props.userID) {
            navigate('/login'); // or whatever fallback route you want
        }
    }, [props.userID, navigate]);

    const setLoading = (value) => {
        loading.current=value
    }

    const setCachedNextVideosBytes = (value) => {
        cachedNextVideosBytes.current = value
    }

    const setCurrentVideos = (value) => {
        currentVideos.current = value
    }

    const setLabels = (value) => {
        labels.current = value
    }

    const setVideoRating = (value) => {
        videoRating.current = value
    }


    const setCurrentVideoData = (value) => {
        currVideoData.current = value
    }

    useEffect(() => {
        let timestamp = new Date().toLocaleString()
        let request = {
            userTrialEventID: userID + "_" + timestamp,
            videoID: "",
            userID: userID,
            blockNum: "",
            timestamp: timestamp,
            eventType: "reachedAnnotation"
        }
        uploadEvent(request, setDidNetworkFail)

        const totalCount = videoIDs.reduce((acc, sublist) => acc + sublist.length, 0);

        setTotalVideos(totalCount)
    }, []);

    useEffect(() => {
        if (annotationState === ANNOTATION_STATE.WATCH_VIDEO_1){
            setVideoCounterProgress(prev => prev + 1);

            const video = document.getElementById('video');
            try {
                video.onended = function() {
                    setAnnotationState(ANNOTATION_STATE.VIDEO_SPACER)
                }
                video.load();
            }catch (e) {
                console.log(e)
            }
        }
        else if (annotationState === ANNOTATION_STATE.WATCH_VIDEO_2) {
            const video = document.getElementById('video');
            try {
                video.onended = function() {
                    setAnnotationState(ANNOTATION_STATE.INPUT_LABELS)
                }
                video.load();
            }catch (e) {
                console.log(e)
            }
        }
        else if (annotationState === ANNOTATION_STATE.LOAD_NEXT_BLOCK){
            if (currentBlock.current >= videoIDs.length) {
                console.log("COMPLETE")
                setDidComplete(true)
            }
            else if (currentBlock.current > 0) {
                setLoading(true); // optional if you want it set before the call
                checkLoadingNextBlock()
            } else { // first load!!!
                const request = {
                    videoIDs: JSON.stringify(videoIDs[currentBlock.current]),
                    userID: userID
                };

                setLoading(true); // optional if you want it set before the call

                getVideosForBlock(request, setLoading, setCurrentVideos, setDidNetworkFail)
                    .then(() => {
                        console.log("FIRST VIDEO RETRIEVAL");
                        // now load next block before proceeding
                        loading.current = true
                        checkLoadingNextBlock()
                    })
                    .catch((err) => {
                        console.error("Failed to retrieve videos", err);
                    });
            }
        }
    }, [annotationState]);

    const onClickNextVideo = () => {
        // increment in the block
        console.log(videoIDs[currentBlock.current].length)
        if (currentIndexInBlock.current + 1 < videoIDs[currentBlock.current].length){
            currentIndexInBlock.current = currentIndexInBlock.current + 1
            // go to next video
            setCurrentVideoData(currentVideos.current[currentIndexInBlock.current])
            setAnnotationState(ANNOTATION_STATE.WATCH_VIDEO_1)
        } else { // else set up loading
            currentIndexInBlock.current = 0
            currentBlock.current = currentBlock.current + 1
            setAnnotationState(ANNOTATION_STATE.LOAD_NEXT_BLOCK)
        }
    }

    const onClickPlayVideoSecond = () => {
        setAnnotationState(ANNOTATION_STATE.WATCH_VIDEO_2)
    }

    const checkLoadingNextBlock = () => {
        loadingRetries.current = loadingRetries.current + 1
        if (loading.current) {
            // NOT FIRST TIME LOADING
            if (currentBlock.current > 0) {
                currentIndexInBlock.current = 0
                currentVideos.current = structuredClone(cachedNextVideosBytes.current)
            }
            setCurrentVideoData(currentVideos.current[currentIndexInBlock.current])
            setAnnotationState(ANNOTATION_STATE.WATCH_VIDEO_1)
            setCanStartNextBlock(true)
            if (currentBlock.current + 1 < videoIDs.length) {
                // LOAD NEXT BLOCK after the next
                let request = {
                    videoIDs: JSON.stringify(videoIDs[currentBlock.current + 1]),
                    userID: userID
                }
                getVideosForBlock(request, setLoading, setCachedNextVideosBytes, setDidNetworkFail)
            }
            else {
                setLoading(false)
            }

        } else {
            // loop this logic
            setTimeout(function () {
                if (loadingRetries.current > 100) {
                    setDidNetworkFail(true)
                } else {
                    console.log("retry checking")
                    checkLoadingNextBlock()
                }
            }, 2000);
        }
    }


    if (didNetworkFail) {
        return <Navigate to={"/complete"} state={{
            message: "Network Failed",
            type: "networkFailure"
        }} replace={true} />
    } else if (!canStartNextBlock) {
        return <CircularProgress
            sx={{color: '#000000'}}
            style={{ width: "10%", height: "10%"}}
        />
    } else if (didComplete) {
        return <Navigate to={"/complete"} state={{
            message: "All trials have been completed",
            type: "successful",
            userID: userID
        }} replace={true} />
    }
    else {
        return (
            <Container maxWidth={false} disableGutters sx={{
                flexDirection: 'column',
                display: 'flex', backgroundColor: '#FFFFFF'
            }}>
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    zIndex: 10,
                    backgroundColor: '#fff8',
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    <Typography variant="body1" sx={{
                        p:3,
                    }}>
                        Progress: {videoCounterProgress} / {totalVideos}
                    </Typography>
                </div>
                <Box   display="flex"
                       justifyContent="center"
                       alignItems="center"
                       sx={{
                           flexDirection: 'column',
                           display: 'flex', backgroundColor: '#FFFFFF',
                           overflow: "auto", overflowY: "scroll",
                       }}
                       height="100vh"
                >
                    {annotationState === ANNOTATION_STATE.WATCH_VIDEO_1
                    || annotationState === ANNOTATION_STATE.WATCH_VIDEO_2 ? (
                        <VideoContainer setAnnotationState={setAnnotationState}
                        videoSrc={`data:video/mpeg;base64,${currVideoData.current.videoData}`}>
                        </VideoContainer>
                    ) : annotationState === ANNOTATION_STATE.INPUT_LABELS ? (
                        <InputLabels setLabels={setLabels}
                                     setVideoRating={setVideoRating}
                                     setAnnotationState={setAnnotationState}>
                        </InputLabels>
                    ) : annotationState === ANNOTATION_STATE.ANNOTATION ? (
                        <VideoAnnotator videoSrc={`data:video/mpeg;base64,${currVideoData.current.videoData}`}
                                        labels={labels.current}
                                        setAnnotationState={setAnnotationState}
                                        userID={userID}
                                        videoID={currVideoData.current.videoID}
                                        setDidNetworkFail={setDidNetworkFail}
                                        videoRating={videoRating}
                        >
                        </VideoAnnotator>
                    ) : annotationState === ANNOTATION_STATE.VIDEO_SPACER ? (
                        <Button onClick={onClickPlayVideoSecond}>
                            CLICK TO WATCH VIDEO FOR SECOND TIME
                        </Button>
                    ): annotationState === ANNOTATION_STATE.WAITING_PAGE_FOR_NEXT ? (
                        <Button onClick={onClickNextVideo}>
                            CLICK FOR NEXT VIDEO
                        </Button>
                    ) : (
                         <CircularProgress
                                sx={{color: '#000000'}}
                            style={{ width: "10%", height: "10%"}}
                        />
                    )}
                </Box>
            </Container>
        );
    }

};

export default AnnotationManager;