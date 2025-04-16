import React, {useState} from 'react';
import {Alert, Box, Button, Snackbar, TextField, Typography} from "@mui/material";
import {useNavigate} from "react-router-dom";
import {ENDPOINT} from "../fetch/fetch";

const Login = () => {
    const [userIDInput, setUserIDInput] = useState('');
    const [isError, setIsError] = useState(false)
    const navigate = useNavigate();

    const handleSignIn = () => {
        fetch(`${ENDPOINT}/users/generateusertrials/${userIDInput}`).then((response) => {
            if (!response.ok) {
                setIsError(true)
            }
            return response.json();
        })
            .then((data) => {
                if (data.status !== 500) {
                    navigate(
                        '../experimentmanager',
                        {
                            state: {
                                userID: userIDInput,
                                videoIDs : data,
                                numBlocks: data.length
                            }
                        })
                }
            })
            .catch((error) => {
                console.error('Error fetching search results: ', error);
            })
    }

    const navToAnnotateVideo = () => {
        navigate('../videoannotator')
    }

    return (
        <div>
            <Snackbar open={isError} autoHideDuration={3000} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
                <Alert severity="error" sx={{ width: '100%' }}>
                    ERROR: The user id does not exist, or network error.
                </Alert>
            </Snackbar>
            <Box style={{marginTop: 100}} sx={{p: 3, marginRight: 15, marginLeft: 15,
                flexDirection: 'column',
                display: 'flex',
            }} alignItems={"center"} justifyContent="center">
                <Typography variant="h2" gutterBottom>
                    Enter User ID
                </Typography>
                <TextField
                    style={{marginRight: 15, width: 500, marginBottom: 20}}
                    id="filled-search"
                    label="User ID"
                    type="search"
                    variant="filled"
                    value={userIDInput}
                    color={"primary"}
                    onChange={(e) => setUserIDInput(e.target.value)}
                />
                <Box style={{marginTop: 5}} sx={{p: 3,
                    flexDirection: 'row',
                    display: 'flex',
                }}>
                    <Button
                        variant="contained" onClick={handleSignIn}>Sign In</Button>
                </Box>
            </Box>
        </div>
    );
}

export default Login;