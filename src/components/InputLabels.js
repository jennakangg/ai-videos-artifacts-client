import React, { useState } from 'react';
import {Box, TextField, Button, Chip, Stack, Alert, Slider, Typography, Modal} from '@mui/material';
import { ANNOTATION_STATE } from "../utils/Constants";

export default function InputLabels(props) {
    const [input, setInput] = useState('');
    const [labels, setLabels] = useState([]);
    const [videoRating, setVideoRating] = useState(5);
    const [showRatingModal, setShowRatingModal] = useState(false);

    const [error, setError] = useState(false);
    const maxLabels = 5;

    const handleAddLabel = () => {
        const trimmed = input.trim();
        if (!trimmed || labels.includes(trimmed)) {
            setInput('');
            return;
        }

        if (labels.length >= maxLabels) {
            setError(true);
        } else {
            setLabels(prev => [...prev, trimmed]);
            setError(false);
        }

        setInput('');
    };

    const handleDelete = (labelToDelete) => {
        setLabels(prev => prev.filter(label => label !== labelToDelete));
        setError(false); // Clear error when a label is removed
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddLabel();
        }
    };

    const submitLabels = () => {
        props.setLabels(labels);
        props.setVideoRating(videoRating)
        props.setAnnotationState(ANNOTATION_STATE.ANNOTATION);
    };

    return (
        <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            sx={{ width: '100%', p: 2, flexDirection: 'column' }}
        >
            <Stack direction="row" spacing={2} alignItems="center">
                <TextField
                    label="Enter label"
                    variant="outlined"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <Button variant="contained" onClick={handleAddLabel}>
                    Add
                </Button>
            </Stack>

            {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    Maximum of {maxLabels} labels allowed.
                </Alert>
            )}
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

            <Button
                onClick={()=>{setShowRatingModal(true)}}
                // disabled={labels.length === 0}
                sx={{ mt: 2 }}
            >
                {labels.length === 0 ? "No visible artifacts" : "Done"}
            </Button>
            <Modal
                open={showRatingModal}
                onClose={() => {
                    setShowRatingModal(false)
                }}
                sx={{
                    p: 3,
                    display:'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Box   display="flex"
                       justifyContent="center"
                       alignItems="center"
                       sx={{
                           flexDirection: 'column',
                           display: 'flex',
                           boxShadow: 24,
                           maxHeight: '90vh',
                           borderRadius: '16px',
                           borderColor: 'primary.main',
                           backgroundColor: '#FFFFFF',
                           alignItems: 'center',
                           width: '70%',
                       }}>
                    <Box
                        display="flex"
                        justifyContent="center"
                        alignItems="center"
                        sx={{ width: '80%', p: 6, flexDirection: 'column' }}
                    >
                        <Slider
                            defaultValue={5}
                            valueLabelDisplay="on"
                            step={1}
                            marks
                            min={1}
                            max={7}
                            aria-label="Always visible"
                            onChange={(e) =>{
                                setVideoRating(e.target.value)
                            }}
                        />
                        <Typography variant="body1" sx={{
                            p:2,
                            color: "#000000"
                        }}>
                            Please rate the video quality on a scale of 1 to 7
                        </Typography>
                    </Box>
                    <Box sx={{flexDirection: 'row', display: 'flex', p: 3}}
                    >
                        <Button sx={{marginRight: "20px"}} onClick={()=>{setShowRatingModal(false)}} variant="contained" color="error" >
                            Cancel
                        </Button>
                        <Button sx={{marginLeft: "20px"}} onClick={submitLabels} variant="contained" color="success" >
                            Submit
                        </Button>
                    </Box>
                </Box>
            </Modal>
        </Box>
    );
}
