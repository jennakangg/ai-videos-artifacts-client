import React, { useState } from 'react';
import { Box, TextField, Button, Chip, Stack } from '@mui/material';
import {ANNOTATION_STATE} from "../utils/Constants";

export default function InputLabels(props) {
    const [input, setInput] = useState('');
    const [labels, setLabels] = useState([]);

    const handleAddLabel = () => {
        const trimmed = input.trim();
        if (trimmed && !labels.includes(trimmed)) {
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

    const submitLabels = () => {
        props.setLabels(labels)
        props.setAnnotationState(ANNOTATION_STATE.ANNOTATION)
    }

    return (
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
                <Button variant="contained" onClick={handleAddLabel}>
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
            <Button onClick={submitLabels} disabled={labels.length === 0}>
                Submit Labels
            </Button>
        </Box>
    );
}
