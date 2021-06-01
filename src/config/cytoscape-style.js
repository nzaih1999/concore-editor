import { NodeStyle, EdgeStyle } from './defaultStyles';

const style = [
    {
        selector: 'node[type = "ordin"]',
        style: {
            content: 'data(label)',
            ...NodeStyle,
            'z-index': 100,
        },
    },

    {
        selector: 'edge',
        style: {
            'curve-style': 'bezier',
            ...EdgeStyle,
        },
    },
    {
        selector: 'edge[label]',
        style: {
            label: 'data(label)',
            width: 3,
            'edge-text-rotation': 'autorotate',
            'z-index': 999,
            'text-margin-y': '10px',
        },
    },
    {
        selector: '.eh-handle',
        style: {
            'background-color': '#f00',
            height: 20,
            width: 20,
            opacity: 0.5,
        },
    },
    {
        selector: 'node[type="special"]',
        style: {
            width: 10,
            height: 10,
            backgroundColor: 'red',
            'z-index': 1000,
        },
    },
    {
        selector: ':selected',
        style: {
            'overlay-color': '#000',
            'overlay-opacity': 0.1,
        },
    },

];

export default style;
