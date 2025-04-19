import React, { useState } from 'react';
import { Box, TextField, Button, Chip, Stack, Alert } from '@mui/material';
import { ANNOTATION_STATE } from "../utils/Constants";

export default function InputLabels(props) {
    const [input, setInput] = useState('');
    const [labels, setLabels] = useState([]);
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
                onClick={submitLabels}
                disabled={labels.length === 0}
                sx={{ mt: 2 }}
            >
                Submit Labels
            </Button>
        </Box>
    );
}
