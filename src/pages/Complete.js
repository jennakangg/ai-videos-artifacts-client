import {Box, CircularProgress, Container, Typography} from "@mui/material";
import React, {useEffect, useState} from "react";
import {useLocation} from "react-router-dom";
import {getCode} from "../fetch/fetch";
import {NETWORK_FAILED_CODE} from "../utils/Constants";

const Complete = (props) => {
    const { state } = useLocation();

    const [codeValue, setCodeValue] = useState("")
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (state.type === "networkFailure") {
            setCodeValue(NETWORK_FAILED_CODE)
            setLoading(false)
        } else {
            getCode(state.type, setLoading, setCodeValue)
        }
    }, []);

    return (
        <Container maxWidth={false} disableGutters sx={{
            flexDirection: 'column',
            display: 'flex', backgroundColor: '#808080'
        }}>
            <Box   display="flex"
                   justifyContent="center"
                   alignItems="center"
                   minHeight="100vh"
                   minWidth="100wh"
                   sx={{
                       flexDirection: 'column',
                       display: 'flex', backgroundColor: '#808080'
                   }}>
                <Typography variant="h5">
                    {state.message}
                </Typography>
                {loading ?
                    <CircularProgress
                        sx={{color: '#FFFFFFFF'}}
                        style={{width: "10%", height: "10%"}}
                    /> :
                        <Typography variant="h5">
                            code: {codeValue}
                        </Typography>
                }
            </Box>
        </Container>
    );
};

export default Complete;