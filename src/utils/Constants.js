export const isDev = false
export const NETWORK_FAILED_CODE = "C1E01N3N"
export const MAX_LABELS = 5

export const STUDY_STATE = Object.freeze({
    LOGIN: 'login',
    TRAINING: 'training',
    STUDY: 'study',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
});

export const ANNOTATION_STATE = Object.freeze({
    WATCH_VIDEO_1: 'watch_video_1',
    VIDEO_SPACER: 'video_spacer',
    WATCH_VIDEO_2: 'watch_video_2',
    INPUT_LABELS: 'input_labels',
    ANNOTATION: 'annotation',
    WAITING_PAGE_FOR_NEXT: 'waiting_page_for_next',
    LOAD_NEXT_BLOCK: 'load_next_block'
});