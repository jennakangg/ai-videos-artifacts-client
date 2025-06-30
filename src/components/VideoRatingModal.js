import React from 'react';
import {Box, Button, Modal, Slider, Typography} from "@mui/material";

export default function VideoRatingModal (props) {
    return (
        <Modal
            open={props.showRatingModal}
            onClose={() => {
                props.setShowRatingModal(false)
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
                        defaultValue={4}
                        valueLabelDisplay="on"
                        step={1}
                        marks
                        min={1}
                        max={7}
                        aria-label="Always visible"
                        onChange={(e) =>{
                            props.setVideoRating(e.target.value)
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
                    <Button sx={{marginRight: "20px"}} onClick={()=>{props.setShowRatingModal(false)}} variant="contained" color="error" >
                        Cancel
                    </Button>
                    <Button sx={{marginLeft: "20px"}} onClick={props.onClickFunction} variant="contained" color="success" >
                        Submit
                    </Button>
                </Box>
            </Box>
        </Modal>
    );
};