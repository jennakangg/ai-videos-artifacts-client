import {Box, Button, Container, Typography} from "@mui/material";
import React, {useEffect, useState} from "react";
import {Navigate, useLocation, useNavigate} from "react-router-dom";
import {uploadEvent} from "../fetch/fetch";
import {ANNOTATION_STATE, STUDY_STATE} from "../utils/Constants"
import AnnotationManager from "./AnnotationManager";

const ExperimentManager = (props) => {
    const location = useLocation();
    const state = location?.state || null;

    const [experimentState, setExperimentState] = useState(STUDY_STATE.STUDY)
    const [didNetworkFail, setDidNetworkFail] = useState(false)

    useEffect(() => {
        if (state && state.userID){
            let timestamp = new Date().toLocaleString()
            let request = {
                userTrialEventID: state.userID + "_" + timestamp,
                videoID: "",
                userID: state.userID,
                blockNum: "",
                timestamp: timestamp,
                eventType: "reachedExperiment"
            }
            uploadEvent(request, setDidNetworkFail)
        }
    }, []);

    if (didNetworkFail) {
        return <Navigate to={"/complete"} state={{
            message: "Network Failed",
            type: "networkFailure"
        }} replace={true} />
    } else if (!state || !state.userID) {
        return <Navigate to={"/login"}/>
    } else {
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
                    {experimentState === STUDY_STATE.STUDY ? (
                        <AnnotationManager annotationState={ANNOTATION_STATE.LOAD_NEXT_BLOCK}
                            setExperimentState={setExperimentState}
                            videoIDs={state.videoIDs} userID={state.userID}
                        >
                        </AnnotationManager>
                    ) : experimentState === STUDY_STATE.COMPLETED ? (
                        <Typography variant="h5" color="white">
                            Study completed lol
                        </Typography>
                    ) : (
                        <Box width={200} height={100} bgcolor="white">
                            INVALID STUDY VALUE
                        </Box>
                    )}
                </Box>
            </Container>
        );
    }

};

export default ExperimentManager;