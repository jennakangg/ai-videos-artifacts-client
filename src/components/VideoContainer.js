import React from 'react';
import {Box} from "@mui/material";

export default function VideoContainer (props) {
    const imageHeight= 1080
    const imageWidth = 1920

    return (
        <Box>
            <video
                id="video"
                muted
                autoPlay
                // width={Math.round(imageWidth * props.imageDim)}
                // height={Math.round(imageHeight * props.imageDim)}
            >
                <source id="src" type="video/mp4"
                        src={props.videoSrc}
                ></source>
            </video>
        </Box>
    );
};