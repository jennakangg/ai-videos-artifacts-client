import {Box, Button, Container, Modal, Typography} from "@mui/material";
import React, {useEffect, useState} from "react";
import {Navigate, useLocation, useNavigate} from "react-router-dom";
import {uploadEvent} from "../fetch/fetch";
import Directions from "./Directions";

const IntroConsent = (props) => {
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
            eventType: "reachedIntroConsent"
        }
        uploadEvent(request, setDidNetworkFail)
        const handler = (event) => {
            event.preventDefault();
            if (event.repeat) return;
            if (event.keyCode === 32) {
                event.stopPropagation()
                event.cancelBubble = true
                setShowConsent(true)
            }
        };
        document.addEventListener('keydown', handler, false);

        return () => document.removeEventListener('keydown', handler);
    }, []);

    if (didNetworkFail) {
        return <Navigate to={"/complete"} state={{
            message: "Network Failed",
            type: "networkFailure"
        }} replace={true} />
    } else {
        return (
            <Container maxWidth={false} disableGutters sx={{
                flexDirection: 'column',
                display: 'flex', backgroundColor: '#000000'
            }}>
                <Box   display="flex"
                       justifyContent="center"
                       alignItems="center"
                       sx={{
                           flexDirection: 'column',
                           display: 'flex', backgroundColor: '#000000',
                           overflow: "auto", overflowY: "scroll",
                           width: '75vw',
                           margin: 'auto'
                       }}
                       height="100vh"
                >
                    <Typography variant="h5" sx={{
                        p: 1,
                        color: "#FFFFFF",
                    }}>
                        Welcome to Our Study on AI-Generated Videos
                    </Typography>
                    <Typography variant="h6" sx={{
                        p: 1,
                        color: "#FFFFFF",
                        fontStyle: 'italic'
                    }}>
                        Prolific ID Required
                    </Typography>
                    <Typography variant="h6" sx={{
                        p: 6,
                        color: "#FFFFFF",
                    }}>
                        <br/><br/>
                        Thank you for joining our research on how people detect visual artifacts in AI-generated videos. This study is being conducted for academic research purposes.
                        <br/><br/>
                        Before You Begin: <br/>
                        • Please ensure you are using a desktop or laptop (mobile devices are not supported). <br/>
                        • Make sure your Prolific ID is entered correctly so we can approve your submission. <br/>
                        • Complete the study in one sitting without distractions. <br/>

                        What You'll Do: <br/>
                        • Watch a series of short video clips. <br/>
                        • Indicate whether you notice any visual artifacts or abnormalities. <br/>
                        • The study will take approximately [TODO insert estimated time, e.g., 12 minutes] to complete. <br/>

                        Important: <br/>
                        • You must be at least 18 years old to participate. <br/>
                        • All responses are anonymous and confidential. <br/>
                        • You will be compensated in line with Prolific’s fair pay guidelines. <br/><br/>

                        Please press SPACE to proceed.
                    </Typography>
                    <Modal
                        open={showConsent}
                        onClose={() => {
                            setShowConsent(false)
                        }}
                        sx={{
                            p: 3,
                            overflow:'scroll',
                            display:'block'
                        }}
                    >
                        <Box   display="flex"
                               justifyContent="center"
                               alignItems="center"
                               sx={{
                                   flexDirection: 'column',
                                   display: 'flex', backgroundColor: '#000000',
                                   border: 1,
                                   borderRadius: '16px',
                                   borderColor: 'primary.main'
                               }}>
                            <Typography variant="body1" sx={{
                                p:5,
                                color: "#FFFFFF"
                            }}>
                                Consent Form for IRB-FY2022-5830
                                <br/><br/>
                                You have been invited to take part in a research study to learn more about human perception of AI generated videos. This study will be conducted by Jenna Kang, TANDON - Computer Science & Engineering (CSE), Tandon School of Engineering, New York University, as a part of her Doctoral Dissertation. Her faculty sponsor is Professor Qi Sun, Department of TANDON - Computer Science & Engineering (CSE), Tandon School of Engineering, New York University.
                                <br/><br/>
                                If you agree to be in this study, you will be asked to do the following: <br/>
                                • Observe a series of AI generated videos<br/>
                                • List the artifacts that you noticed in each video<br/>
                                • Label bounding boxes around what you think are associated with the artifacts listed previously, via a keyboard and mouse
                                <br/><br/>
                                Participation in this study will involve 40 minutes. There are no known risks associated with your participation in this research beyond those of everyday life.
                                <br/><br/>
                                Although you will receive no direct benefits, it is hoped that this study will contribute to knowledge about human perception of AI generated videos. Compensation is provided via a standard hourly rate of $15/hour.
                                <br/><br/>
                                Confidentiality of your research records will be strictly maintained by code numbers that are assigned to each participant. Information not containing identifiers may be used in future research, shared with other researchers, or placed in a data repository without your additional consent.
                                <br/><br/>
                                Participation in this study is voluntary. You may refuse to participate or withdraw at any time without penalty. For interviews, questionnaires, or surveys, you have the right to skip or not answer any questions you prefer not to answer.
                                <br/><br/>
                                If there is anything about the study or your participation that is unclear or that you do not understand, if you have questions or wish to report a research-related problem, you may contact Jenna Kang, jennakang@nyu.edu, 370 Jay Street, or the faculty sponsor, Qi Sun, qisun@nyu.edu, 370 Jay Street.
                                <br/><br/>
                                For questions about your rights as a research participant, you may contact the University Committee on Activities Involving Human Subjects (UCAIHS), New York University, 665 Broadway, Suite 804, New York, New York, 10012, at ask.humansubjects@nyu.edu or (212) 998-4808. Please reference the study # (IRB-FY2022-5830) when contacting the IRB (UCAIHS).
                                <br/><br/>
                                You have received a copy of this consent document to keep.
                            </Typography>
                            <a href={"https://drive.google.com/file/d/1FGBHqFON044kmt26N3E50LZ7_0pb8iN6/view?usp=sharing"}
                               target="_blank" rel="noopener noreferrer"
                            >
                                <Button>
                                    Go to consent form
                                </Button>
                            </a>
                            <Box sx={{flexDirection: 'row', display: 'flex', p: 3}}
                            >
                                <Button sx={{marginRight: "20px"}} onClick={() => {
                                    navigate(
                                        '../directions',
                                        {
                                            state: {
                                                userID: state.userID,
                                                videoIDs : state.videoIDs,
                                                numBlocks: state.numBlocks
                                            }
                                        })
                                }} variant="contained" color="success" >
                                    Agree
                                </Button>
                                <Button onClick={() => {
                                    navigate(
                                        '../complete',
                                        {
                                            state: {
                                                message: "Declined Consent",
                                                type: "declined"
                                            }
                                        })
                                }} variant="contained" color="error" >
                                    Decline
                                </Button>
                            </Box>
                        </Box>
                    </Modal>
                </Box>
            </Container>
        );
    }

};

export default IntroConsent;