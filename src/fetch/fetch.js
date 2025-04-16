import {isDev} from "../utils/Constants";

export const ENDPOINT = isDev ? "http://localhost:8080" : "https://n93zcv39tp.us-east-1.awsapprunner.com"

export function uploadTrial(request, setDidNetworkFail) {
    fetch(`${ENDPOINT}/users/uploadtrial?`,
        {
            method: "POST",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request)
        }
    ).then((response) => {
        if (!response.ok) {
            // end study
            setDidNetworkFail(true)
        }
        return response.statusText;
    }).catch((error) => {
        console.error('Error fetching search results: ', error);
        setDidNetworkFail(true)
    })
}

export function uploadEvent(request, setDidNetworkFail) {
    fetch(`${ENDPOINT}/users/uploadevent?`,
        {
            method: "POST",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request)
        }
    ).then((response) => {
        if (!response.ok) {
            // end study
            setDidNetworkFail(true)
        }
        return response;
    }).catch((error) => {
        console.error('Error fetching search results: ', error);
        setDidNetworkFail(true)
    })
}

export function getVideosForBlock(request, setLoading, setVideoData, setDidNetworkFail) {
    return new Promise((resolve, reject) => {
        fetch(`${ENDPOINT}/video/getvideos`, {
            method: "POST",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request)
        })
            .then((response) => {
                if (!response.ok) {
                    setDidNetworkFail(true);
                    reject("Network response was not ok");
                    return;
                }
                return response.json();
            })
            .then((data) => {
                if (!data || data.length === 0) {
                    console.log("There is nothing for this query");
                }
                setVideoData(data);
                setLoading(false);
                // console.log(data)
                resolve(data); // <- done!
            })
            .catch((error) => {
                setDidNetworkFail(true);
                console.error('Error fetching search results: ', error);
                reject(error);
            });
    });
}


export function getCode(type, setLoading, setCodeValue) {
    fetch(`${ENDPOINT}/users/getcode/${type}`,
        {
            method: "GET",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
        }
    ).then((response) => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
        .then(async (data) => {
            setCodeValue(data)
            setLoading(false)
        })
        .catch((error) => {
            console.error('Error fetching search results: ', error);
        })
}