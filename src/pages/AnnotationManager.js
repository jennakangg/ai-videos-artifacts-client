import {Box, Button, CircularProgress, Container, Typography} from "@mui/material";
import React, {useEffect, useRef, useState} from "react";
import {Navigate} from "react-router-dom";
import {getVideosForBlock, uploadEvent} from "../fetch/fetch";
import {ANNOTATION_STATE} from "../utils/Constants";
import VideoContainer from "../components/VideoContainer";
import InputLabels from "../components/InputLabels";
import VideoAnnotator from "./VideoAnnotator";

const AnnotationManager = (props) => {
    const [didNetworkFail, setDidNetworkFail] = useState(false)
    const [annotationState, setAnnotationState] = useState(props.annotationState)

    const [didComplete, setDidComplete] = useState(false)

    let userID = props.userID
    let videoIDs = props.videoIDs

    const currVideoData = useRef()
    const currentIndexInBlock = useRef(0)
    // load first block on first load
    const currentBlock = useRef(0)
    const labels = useRef([])
    const loading = useRef(true)
    const [canStartNextBlock, setCanStartNextBlock] = useState(false)
    const currentVideos = useRef([])
    const cachedNextVideosBytes = useRef([])

    const loadingRetries = useRef(0);

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
    }, []);

    useEffect(() => {
        if (annotationState === ANNOTATION_STATE.WATCH_VIDEO_1){
            const video = document.getElementById('video');
            try {
                video.onended = function() {
                    setAnnotationState(ANNOTATION_STATE.WATCH_VIDEO_2)
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
            // increment to start next block
            console.log(videoIDs.length)
            console.log(currentBlock.current)
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
            type: "successful"
        }} replace={true} />
    }
    else {
        return (
            <Container maxWidth={false} disableGutters sx={{
                flexDirection: 'column',
                display: 'flex', backgroundColor: '#FFFFFF'
            }}>
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
                        <InputLabels setLabels={setLabels} setAnnotationState={setAnnotationState}>
                        </InputLabels>
                    ) : annotationState === ANNOTATION_STATE.ANNOTATION ? (
                        <VideoAnnotator videoSrc={`data:video/mpeg;base64,${currVideoData.current.videoData}`}
                                        labels={labels.current}
                                        setAnnotationState={setAnnotationState}
                                        userID={userID}
                                        videoID={currVideoData.current.videoID}
                                        setDidNetworkFail={setDidNetworkFail}
                        >
                        </VideoAnnotator>
                    ) : annotationState === ANNOTATION_STATE.WAITING_PAGE_FOR_NEXT ? (
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