import { saveAs } from 'file-saver';
import localStorageManager from '../local-storage-manager';
import graphmlBuilder from '../graphml/builder';
import BendingDistanceWeight from '../calculations/bending-dist-weight';
import GraphUndoRedo from './4-undo-redo';
import graphMLParser from '../graphml/parser';

class GraphLoadSave extends GraphUndoRedo {
    autoSaveIntervalId

    constructor(...args) {
        super(...args);
        this.autoSaveIntervalId = null;
    }

    registerEvents() {
        super.registerEvents();
        this.cy.on('add remove data dragfreeon', 'node[type="ordin"]', () => this.saveLocalStorage());
        this.cy.on('add remove data', 'edge[type="ordin"]', () => this.saveLocalStorage());
        this.cy.on('nodeediting.resizeend graph-modified', () => this.saveLocalStorage());
    }

    downloadImg(format) {
        this.cy.emit('hide-bend');
        this.cy.$('.eh-handle').remove();
        if (format === 'PNG') saveAs(this.cy.png({ full: true }), `${this.getName()}-DHGWorkflow.png`);
        if (format === 'JPG') saveAs(this.cy.jpg({ full: true }), `${this.getName()}-DHGWorkflow.jpg`);
    }

    shouldNodeBeSaved(nodeID) {
        return this.getById(nodeID).data('type') === 'ordin';
    }

    shouldEdgeBeSaved(edgeID) {
        return this.getById(edgeID).data('type') === 'ordin';
    }

    // eslint-disable-next-line class-methods-use-this
    getRealSourceId(nodeID) {
        return nodeID;
    }

    static stringifyAction({ actionName, parameters }) {
        return { actionName, parameters: window.btoa(JSON.stringify(parameters)) };
    }

    static parseAction({ actionName, parameters }) {
        return { actionName, parameters: JSON.parse(window.atob(parameters)) };
    }

    jsonifyGraph() {
        const graph = {
            nodes: [],
            edges: [],
            actionHistory: [],
            projectName: this.projectName,
            id: this.id,
            serverID: this.serverID,
            fileName: null,
            fileHandle: null,
        };
        this.cy.nodes().forEach((node) => {
            if (this.shouldNodeBeSaved(node.id())) {
                const all = node.json();
                const nodeJson = {
                    label: all.data.label,
                    id: all.data.id,
                    position: all.position,
                    style: {},
                };
                nodeJson.style = this.getStyle(node.id());
                graph.nodes.push(nodeJson);
            }
        });
        this.cy.edges().forEach((edge) => {
            if (this.shouldEdgeBeSaved(edge.id())) {
                const edgeJson = edge.json().data;
                edgeJson.source = this.getRealSourceId(edge.source().id());
                edgeJson.style = this.getStyle(edge.id());
                edgeJson.bendData.bendPoint = BendingDistanceWeight.getCoordinate(
                    edgeJson.bendData.bendWeight, edgeJson.bendData.bendDistance,
                    edge.source().position(), edge.target().position(),
                );
                graph.edges.push(edgeJson);
            }
        });
        graph.actionHistory = this.actionArr.map(({
            tid, inverse, equivalent, authorName, hash,
        }) => ({
            tid,
            authorName,
            inverse: GraphLoadSave.stringifyAction(inverse),
            equivalent: GraphLoadSave.stringifyAction(equivalent),
            hash,
        }));
        return graph;
    }

    getName() {
        return `${this.projectName}`;
    }

    async saveToDisk() {
        const str = graphmlBuilder(this.jsonifyGraph());
        const bytes = new TextEncoder().encode(str);
        const blob = new Blob([bytes], { type: 'application/json;charset=utf-8' });
        if (navigator.userAgent.indexOf('Edg') !== -1 || navigator.userAgent.indexOf('Chrome') !== -1) {
            const options = {
                types: [
                    {
                        description: 'GraphMl Files',
                        accept: {
                            'text/graphml': ['.graphml'],
                        },
                    },
                ],
            };
            const handle = await window.showSaveFilePicker(options);
            const stream = await handle.createWritable();
            await stream.write(blob);
            await stream.close();
        } else {
            // eslint-disable-next-line no-alert
            const fileName = prompt('Filename:');
            saveAs(blob, `${fileName || `${this.getName()}-concore`}.graphml`);
        }
    }

    saveToFolder() {
        const str = graphmlBuilder(this.jsonifyGraph());
        return str;
    }

    getGraphML() {
        return graphmlBuilder(this.jsonifyGraph());
    }

    loadJson(content) {
        content.nodes.forEach((node) => {
            this.addNode(node.label, node.style, 'ordin', node.position, {}, node.id, 0);
        });
        content.edges.forEach((edge) => {
            this.addEdge({ ...edge, sourceID: edge.source, targetID: edge.target }, 0);
        });
        content.actionHistory.forEach(({
            inverse, equivalent, tid, authorName,
        }) => {
            this.addAction(GraphLoadSave.parseAction(inverse), GraphLoadSave.parseAction(equivalent), tid, authorName);
        });
        this.setProjectName(content.projectName);
        this.setServerID(this.serverID || content.serverID);
    }

    saveLocalStorage() {
        if (this.autoSaveIntervalId !== null) clearTimeout(this.autoSaveIntervalId);
        this.autoSaveIntervalId = setTimeout(() => localStorageManager.save(this.id, this.jsonifyGraph()), 1000);
    }

    setGraphML(graphML) {
        graphMLParser(graphML).then((graphObject) => {
            localStorageManager.save(this.id, graphObject);
            this.loadGraphFromLocalStorage();
        });
    }

    resetLocalStorage() {
        localStorageManager.clearGraph(this.id);
    }

    loadGraphFromLocalStorage() {
        this.reset();
        const graphContent = localStorageManager.get(this.id);
        if (!graphContent) return false;
        this.loadJson(graphContent);
        return true;
    }

    serializeGraph() {
        return window.btoa(JSON.stringify(this.jsonifyGraph()));
    }
}

export default GraphLoadSave;
