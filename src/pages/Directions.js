import {Box, Button, Container, Modal, Typography} from "@mui/material";
import React, {useEffect, useState} from "react";
import {Navigate, useLocation, useNavigate} from "react-router-dom";
import {uploadEvent} from "../fetch/fetch";

const Directions = (props) => {
    const { state } = useLocation();
    console.log(state)
    const [showConsent, setShowConsent] = useState(false)
    const [didNetworkFail, setDidNetworkFail] = useState(false)
    const navigate = useNavigate();

    useEffect(() => {
        let timestamp = new Date().toLocaleString()
        let request = {
            userTrialEventID: state.userID + "_" + timestamp,
            videoID: "",
            userID: state.userID,
            blockNum: "",
            timestamp: timestamp,
            eventType: "reachedDirections"
        }
        uploadEvent(request, setDidNetworkFail)
    }, []);

    if (didNetworkFail) {
        return <Navigate to={"/complete"} state={{
            message: "Network Failed",
            type: "networkFailure"
        }} replace={true} />
    } else {
        return (
            <Container maxWidth={false}
                       justifyContent="center"
                       alignItems="center"
                       disableGutters sx={{
                flexDirection: 'column',
                display: 'flex', backgroundColor: '#000000'
            }}>
                <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    sx={{
                        flexDirection: 'column',
                        backgroundColor: '#000000',
                        overflowY: 'scroll',
                        // height: '100vh',
                        width: '75vw',
                        margin: 'auto'
                    }}
                >
                    <Typography variant="h4" sx={{
                        p: 3,
                        color: "#FFFFFF",
                        fontWeight: 'bold'
                    }}>
                        Artifact labeling instructions
                        <br/><br/>
                    </Typography>
                    <Typography variant="h5" sx={{
                        p: 2,
                        color: "#FFFFFF",
                    }}>
                        First, you will view an AI-generated video twice in a row. Your task during this phase is to try to look for any visual artifacts that appear in the video.
                        <br/><br/>
                        Next, you will report the kinds of artifacts you saw in the video.
                        <br/>
                        <br/>1.  To label the kind of artifacts, (TODO INSTRUCTION ABT HOW TO ENTER THE ARTIFACT TYPE)
                        <br/>2.  For example, if you saw an artifact that exhibited unrealistic physics, you would enter an artifact type such as "impossible physics" and press the "enter" key.
                        <br/>3.  You can only report up to 5 different kinds of artifact types. If you saw more than 5 different kinds of artifacts, you should report the ones that were most obvious and distracting in the video.
                        <br/><br/>
                        After reporting the *kinds* of artifacts, you will then label their locations in the video. To label an artifact's location in the video, you should:
                        <br/>1.  Identify the first frame in the video where the artifact appeared (use the video timeline at the bottom of the video to navigate through the video timestamps).
                        <br/>2.  Draw a bounding box on the video that covers the pixels where the artifact appeared. To draw a bounding box, click and drag with your mouse on the video.
                        <br/>3.  Identify the last frame where the artifact appeared in the video, navigate to it using the timeline, and place another bounding box that covers the pixels containing the artifact.
                        <br/>4.  If the artifact follows a nonlinear path through the video frame between the first and final frames where it appeared, you can navigate to intermediate frames where the artifact appeared and add additional bounding boxes to further specify the trajectory of the artifact through the video.
                        <br/>5.  If you don’t draw a bounding box on every frame, that’s okay — we’ll automatically fill in the gaps by smoothly moving and resizing the box between the frames you do label. Just make sure to add boxes at key points where the object changes position or size.
                        <br/><br/>
                    </Typography>
                    <Typography variant="h5" sx={{
                        p: 2,
                        color: "#FFFFFF",
                        fontWeight: 'bold'
                    }}>
                        This labeling process should be completed for all artifacts you found, up to a maximum of 5 artifacts total per video.
                    </Typography>
                    <Box sx={{p: 3}}>
                        <Button sx={{p:1}} onClick={() => {
                            navigate(
                                '../experimentmanager',
                                {
                                    state: {
                                        userID: state.userID,
                                        videoIDs : state.videoIDs,
                                        numBlocks: state.numBlocks
                                    }
                                })
                        }} variant="contained" >
                            Continue
                        </Button>
                    </Box>
                </Box>
            </Container>
        );
    }

};

export default Directions;