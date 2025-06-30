import React from 'react';
import {
    FormGroup, FormControlLabel, Checkbox, TextField,
    Button, Stack, Chip, Typography, Box
} from '@mui/material';
import {LABEL_TYPES, MAX_LABELS} from "../utils/Constants";

export default function LabelSelector (props) {
    const handleCategoryChange = (category) => {
        props.setSelectedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const handleAddLabel = () => {
        if (props.selectedCategories.length === 0 && props.customLabel.trim() === '') return;

        // Prevent adding more than MAX_LABELS
        if (props.labels.length >= MAX_LABELS) {
            props.setError(true); // Trigger error UI
            return;
        }

        const newLabel = {
            categories: [...props.selectedCategories],
            text: props.customLabel.trim()
        };

        // Check for duplicates and max label count
        if (newLabel && !props.labels.includes(newLabel) && props.labels.length < MAX_LABELS) {
            const updatedLabels = [...props.labels, newLabel];
            props.setLabels(updatedLabels);

            // Auto-select new label if none is selected
            if (!props.currentLabel || updatedLabels.length === 1) {
                props.setCurrentLabel(newLabel);
            }
        }

        props.setSelectedCategories([]);
        props.setCustomLabel('');
        props.setHistoryFunction()
    };

    return (
        <Box>
            <Typography variant="subtitle1">Select Label Categories:</Typography>
            <FormGroup row>
                {Object.entries(LABEL_TYPES).map(([key, value]) => (
                    <FormControlLabel
                        key={key}
                        control={
                            <Checkbox
                                checked={props.selectedCategories.includes(value)}
                                onChange={() => handleCategoryChange(value)}
                            />
                        }
                        label={value}
                    />
                ))}
            </FormGroup>
            <TextField
                label="Custom Label"
                value={props.customLabel}
                onChange={(e) => props.setCustomLabel(e.target.value)}
                size="small"
                sx={{ mt: 2 }}
            />

            <Button
                onClick={handleAddLabel}
                variant="contained"
                sx={{ mt: 2, ml: 2 }}
            >
                Add Label
            </Button>

            <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
                {props.labels.map((labelObj, index) => (
                    <Chip
                        key={index}
                        label={`${labelObj.categories.join(', ')}${labelObj.text ? ' - ' + labelObj.text : ''}`}
                        onDelete={() => props.handleDeleteLabel(index)}
                    />
                ))}
            </Stack>
        </Box>
    );
};