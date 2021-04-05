import React, { Component } from 'react';
import { Stage, Layer } from 'react-konva';
import PropTypes from 'prop-types';
import Node from './Node';
import Line from './Line';

function handleWheel(e) {
  e.evt.preventDefault();

  const scaleBy = 1.08;
  const stage = e.target.getStage();
  const oldScale = stage.scaleX();
  const mousePointTo = {
    x: stage.getPointerPosition().x / oldScale - stage.x() / oldScale,
    y: stage.getPointerPosition().y / oldScale - stage.y() / oldScale,
  };

  const newScale = e.evt.deltaY > 0 ? oldScale * scaleBy : oldScale / scaleBy;

  return {
    stageScale: newScale,
    stageX:
      -(mousePointTo.x - stage.getPointerPosition().x / newScale) * newScale,
    stageY:
      -(mousePointTo.y - stage.getPointerPosition().y / newScale) * newScale,
  };
}

export default class Canvas extends Component {
  constructor(props) {
    super(props);

    const { proofNodes } = this.props;

    this.state = {
      canvasSize: {
        width: 520,
        height: 300,
      },
      stage: {
        stageScale: 1,
        stageX: 0,
        stageY: 0,
      },
      proofNodes,
      showingNodes: {},
      showingEdges: {},
      layer: [],
    };
  }

  componentDidMount() {
    const { showingNodes, proofNodes, canvasSize } = this.state;

    // this.subTreeWidth('0');
    // this.nodeXPosition(canvasSize.width * 0.5, proofNodes['0'].width, 0, '0');

    this.recursivelyAssignLayer('0', 0);
    this.nodeXPositionFitLayer('0', canvasSize.width * 0.5);

    showingNodes['0c'] = new Node(
      this.nodeProps(
        proofNodes[0].conclusion,
        true,
        `${proofNodes[0].id}c`,
        proofNodes['0'].x,
        10
      )
    );

    this.setState({
      showingNodes,
      canvasSize: {
        width:
          document.getElementsByClassName('visualizer')[0].offsetWidth - 30,
        height:
          window.innerHeight -
          (document.getElementsByClassName('navbar')[0].offsetHeight +
            20 +
            document.getElementsByClassName('proof-name')[0].offsetHeight +
            document.getElementsByClassName('node-text')[0].offsetHeight +
            50),
      },
    });
  }

  nodeProps = (children, conclusion, id, x, y) => {
    const { setCurrentText, setFocusText } = this.props;
    return {
      children,
      conclusion,
      id,
      onClick: this.onClick,
      updateParentState: this.updateParentState,
      setFocusText,
      setCurrentText,
      x,
      y,
    };
  };

  lineProps = (key, from, to) => ({
    key,
    points: [from.x + 150, from.y, to.x + 150, to.y + 36],
  });

  onClick = (e) => {
    let { id, x, y, conclusion } = e.target.parent.attrs;
    const { proofNodes, showingNodes, showingEdges } = this.state;
    id = id.replace('c', '');

    if (conclusion && proofNodes[id].showingChildren) {
      proofNodes[id].showingChildren = false;
      showingNodes[`${id}c`].props.showingChildren = false;
      delete showingNodes[id];
      delete showingEdges[`${id}->${id}c`];
      const nodesToBeRemoved = this.recursivelyGetChildren(id);
      nodesToBeRemoved.forEach((node) => {
        proofNodes[node].showingChildren = false;
        delete showingNodes[node];
        delete showingNodes[`${node}c`];
        Object.keys(showingEdges)
          .filter((edgeKey) => {
            const edges = edgeKey.split('->');
            return (
              node === edges[0] ||
              `${node}c` === edges[0] ||
              node === edges[1] ||
              `${node}c` === edges[1]
            );
          })
          .forEach((edge) => {
            delete showingEdges[edge];
          });
      });
    } else if (conclusion) {
      showingNodes[proofNodes[id].id] = new Node(
        this.nodeProps(
          proofNodes[id].rule,
          false,
          proofNodes[id].id,
          proofNodes[id].x,
          y + 100
        )
      );
      showingEdges[`${proofNodes[id].id}->${proofNodes[id].id}c`] = new Line(
        this.lineProps(
          `${proofNodes[id].id}->${proofNodes[id].id}c`,
          showingNodes[proofNodes[id].id].props,
          showingNodes[`${proofNodes[id].id}c`].props
        )
      );
      // const lenChildren = proofNodes[id].children.length - 1;
      proofNodes[id].children.forEach((child, i) => {
        const childNode = proofNodes[child];
        showingNodes[`${childNode.id}c`] = new Node(
          this.nodeProps(
            childNode.conclusion,
            true,
            `${childNode.id}c`,
            childNode.x,
            y + 200
          )
        );
        showingEdges[`${childNode.id}c->${proofNodes[id].id}`] = new Line(
          this.lineProps(
            `${childNode.id}c->${proofNodes[id].id}`,
            showingNodes[`${childNode.id}c`].props,
            showingNodes[proofNodes[id].id].props
          )
        );
      });
      proofNodes[id].showingChildren = true;
      showingNodes[`${id}c`].props.showingChildren = true;
    }
    this.setState({ showingNodes, proofNodes, showingEdges });
  };

  updateParentState = (key, x, y) => {
    const { showingNodes, showingEdges } = this.state;
    showingNodes[key].props.x = x;
    showingNodes[key].props.y = y;
    Object.keys(showingEdges)
      .filter((edgeKey) => edgeKey.indexOf(key) !== -1)
      .forEach((edge) => {
        const [from, to] = edge.split('->');
        showingEdges[edge] = new Line(
          this.lineProps(edge, showingNodes[from].props, showingNodes[to].props)
        );
      });
    this.setState({ showingNodes, showingEdges });
  };

  recursivelyGetChildren = (nodeId) => {
    const { proofNodes } = this.state;
    let nodes = [];
    proofNodes[nodeId].children.forEach((node) => {
      nodes = nodes.concat([node]);
      if (proofNodes[node].showingChildren)
        nodes = nodes.concat(this.recursivelyGetChildren(node));
    });
    return nodes;
  };

  recursivelyAssignLayer = (nodeId, layerNumber) => {
    const { proofNodes, layer } = this.state;
    proofNodes[nodeId].layer = layerNumber;
    layer[layerNumber] = layer[layerNumber] ? layer[layerNumber] + 1 : 1;
    proofNodes[nodeId].positionInLayer = layer[layerNumber] - 1;
    proofNodes[nodeId].children.forEach((node) => {
      this.recursivelyAssignLayer(node, layerNumber + 1);
    });
    this.setState({ proofNodes, layer });
  };

  subTreeWidth = (nodeId) => {
    const { proofNodes } = this.state;
    if (proofNodes[nodeId].children.length === 0) {
      proofNodes[nodeId].width = 400;
    } else {
      proofNodes[nodeId].width = proofNodes[nodeId].children.reduce(
        (totalWidth, node) => totalWidth + this.subTreeWidth(node),
        0
      );
    }
    return proofNodes[nodeId].width;
  };

  nodeXPositionFitLayer(nodeId, firstNodeXPosition) {
    const { proofNodes, layer } = this.state;
    proofNodes[nodeId].x =
      firstNodeXPosition -
      (layer[proofNodes[nodeId].layer] * 400) / 2 +
      proofNodes[nodeId].positionInLayer * 400 +
      50;
    proofNodes[nodeId].children.forEach((node) => {
      this.nodeXPositionFitLayer(node, firstNodeXPosition);
    });
  }

  nodeXPositionSubTreeWidth(parentX, widthParent, siblingSum, nodeId) {
    const { proofNodes } = this.state;
    let childrenSum = 0;
    proofNodes[nodeId].x =
      parentX - widthParent / 2 + siblingSum + proofNodes[nodeId].width / 2;
    proofNodes[nodeId].children.forEach((node) => {
      childrenSum += this.nodeXPositionSubTreeWidth(
        proofNodes[nodeId].x,
        proofNodes[nodeId].width,
        childrenSum,
        node
      );
    });
    return proofNodes[nodeId].width;
  }

  render() {
    const { canvasSize, stage, showingNodes, showingEdges } = this.state;
    return (
      <Stage
        draggable
        width={canvasSize.width}
        height={canvasSize.height}
        onWheel={(e) => this.setState({ stage: handleWheel(e) })}
        scaleX={stage.stageScale}
        scaleY={stage.stageScale}
        x={stage.stageX}
        y={stage.stageY}
        onContextMenu={(e) => e.evt.preventDefault()}
      >
        <Layer>
          {Object.keys(showingNodes).length > 0 &&
            Object.keys(showingNodes).map(function (key) {
              return showingNodes[key].render();
            })}
          {Object.keys(showingEdges).length > 0 &&
            Object.keys(showingEdges).map(function (key) {
              return showingEdges[key];
            })}
        </Layer>
      </Stage>
    );
  }
}

Canvas.propTypes = {
  proofNodes: PropTypes.array,
  setCurrentText: PropTypes.func,
  setFocusText: PropTypes.func,
};
