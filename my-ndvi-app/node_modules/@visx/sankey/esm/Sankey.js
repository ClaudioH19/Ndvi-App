import _pt from "prop-types";
function _extends() { _extends = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }
import React from 'react';
import cx from 'classnames';
import { Group } from '@visx/group';
import { sankey as d3sankey, sankeyLinkHorizontal } from 'd3-sankey';
var DEFAULT_COLOR = '#000';
/**
 * Exposes d3-sankey as a React component.
 */
export default function Sankey(_ref) {
  var root = _ref.root,
    className = _ref.className,
    children = _ref.children,
    nodeId = _ref.nodeId,
    _ref$nodeWidth = _ref.nodeWidth,
    nodeWidth = _ref$nodeWidth === void 0 ? 2 : _ref$nodeWidth,
    nodePadding = _ref.nodePadding,
    nodeAlign = _ref.nodeAlign,
    extent = _ref.extent,
    size = _ref.size,
    iterations = _ref.iterations,
    nodeSort = _ref.nodeSort,
    linkSort = _ref.linkSort,
    _ref$nodeProps = _ref.nodeProps,
    nodeProps = _ref$nodeProps === void 0 ? {} : _ref$nodeProps,
    _ref$linkProps = _ref.linkProps,
    linkProps = _ref$linkProps === void 0 ? {} : _ref$linkProps,
    sourceAccessor = _ref.sourceAccessor,
    targetAccessor = _ref.targetAccessor;
  var sankey = d3sankey();
  if (nodeId) sankey.nodeId(nodeId);
  if (nodeWidth) sankey.nodeWidth(nodeWidth);
  if (nodePadding) sankey.nodePadding(nodePadding);
  if (nodeAlign) sankey.nodeAlign(nodeAlign);
  if (extent) sankey.extent(extent);
  if (size) sankey.size(size);
  if (iterations) sankey.iterations(iterations);
  if (nodeSort) sankey.nodeSort(nodeSort);
  if (linkSort) sankey.linkSort(linkSort);
  var graph = sankey(root);
  var createPath = sankeyLinkHorizontal();
  if (sourceAccessor) createPath.source(sourceAccessor);
  if (targetAccessor) createPath.target(targetAccessor);
  if (children) {
    return /*#__PURE__*/React.createElement(React.Fragment, null, children({
      graph: graph,
      createPath: createPath
    }));
  }
  return /*#__PURE__*/React.createElement(Group, {
    className: cx('visx-sankey', className)
  }, /*#__PURE__*/React.createElement(Group, {
    className: "visx-sankey-links"
  }, graph.links.map(function (link, i) {
    var _createPath, _link$width;
    return /*#__PURE__*/React.createElement("path", _extends({
      d: (_createPath = createPath(link)) != null ? _createPath : '',
      key: i,
      fill: "transparent",
      stroke: DEFAULT_COLOR,
      strokeWidth: Math.max(1, (_link$width = link.width) != null ? _link$width : 0),
      strokeOpacity: 0.5
    }, linkProps));
  })), /*#__PURE__*/React.createElement(Group, {
    className: "visx-sankey-nodes"
  }, graph.nodes.map(function (_ref2, i) {
    var y0 = _ref2.y0,
      y1 = _ref2.y1,
      x0 = _ref2.x0,
      x1 = _ref2.x1;
    return y0 !== undefined && y1 !== undefined && x0 !== undefined && x1 !== undefined ? /*#__PURE__*/React.createElement("rect", _extends({
      fill: DEFAULT_COLOR,
      width: x1 - x0,
      height: y1 - y0,
      x: x0,
      y: y0,
      key: i
    }, nodeProps)) : null;
  })));
}
Sankey.propTypes = {
  className: _pt.string,
  children: _pt.func,
  nodeId: _pt.func,
  nodeWidth: _pt.number,
  nodePadding: _pt.number,
  nodeAlign: _pt.func,
  iterations: _pt.number,
  nodeSort: _pt.func,
  linkSort: _pt.func
};