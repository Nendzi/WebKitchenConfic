function animateSelectedElement(event) {
    const bb = event.fragIdsArray;
    const DOOR_PARTS = NOP_VIEWER.getSelection();
    if (DOOR_PARTS.length > 0) {
        var allElementsInAssembly = searchInOwnAssembly(DOOR_PARTS[0]);
        searchForSolid(allElementsInAssembly, function (solidId) {
            tree.enumNodeFragments(solidId, function (fragId) {
                solidFragIdForAxis.push(fragId);
            });
        });
        if (allElementsInAssembly.length > 2) {
            elementIsOpened = listOfOpenedElements.includes(allElementsInAssembly[0]);
            if (elementIsOpened) {
                //remove from list of opened elements
                listOfOpenedElements = listOfOpenedElements.filter(val => val !== allElementsInAssembly[0]);
                // elements closing
                if (allElementsInAssembly[0].substr(0, 6) === "Drawer") {
                    _animateElement(allElementsInAssembly, -0.5, 0.1, "Drawer");
                } else if (allElementsInAssembly[0].substr(0, 4) === "Leva") {
                    _animateElement(allElementsInAssembly, -0.5, 0.1, "Leva");
                } else if (allElementsInAssembly[0].substr(0, 5) === "Desna") {
                    _animateElement(allElementsInAssembly, -0.5, 0.1, "Desna");
                }
            }
            else {
                // add on list of opened elements
                listOfOpenedElements.push(allElementsInAssembly[0]);
                // elements opening
                if (allElementsInAssembly[0].substr(0, 6) === "Drawer") {
                    _animateElement(allElementsInAssembly, 0, -0.1, "Drawer");
                } else if (allElementsInAssembly[0].substr(0, 4) === "Leva") {
                    _animateElement(allElementsInAssembly, 0, -0.1, "Leva");
                } else if (allElementsInAssembly[0].substr(0, 5) === "Desna") {
                    _animateElement(allElementsInAssembly, 0, -0.1, "Desna");
                }
            }
            NOP_VIEWER.clearSelection();
            solidFragIdForAxis.pop();
        }
    }
}

var tree; // the instance tree

function searchForSolid(candidate, callback) {
    var solid4Axis;
    var str = candidate[0].toLowerCase();
    if (str.search("vrata") != -1) {
        tree.enumNodeChildren(candidate[1], function (child) {
            if (tree.getNodeName(child) === "Solid4Axis") {
                solid4Axis = child;
            }
        }, false);
    }
    callback(solid4Axis);
}

function searchInOwnAssembly(nodeId) {
    var componets = [];

    getNeightboreLeafComponentsFromLeaf(NOP_VIEWER, nodeId, function (dbIds) {
        if (dbIds[0] == "Main element" || dbIds[0].substr(0, 6) == "Closed") {
            return componets;
        }
        for (var i = 0; i < dbIds.length; i++) {
            componets.push(dbIds[i]);
        }
    })

    return componets;
}

function getNeightboreLeafComponentsFromLeaf(viewer, selectedId, callback) {
    var components = []; // store the results    
    var parentNodeId; // id of parant of input (selected) part
    var parentName;

    viewer.getObjectTree(function (objectTree) {
        tree = objectTree;

        parentNodeId = tree.getNodeParentId(selectedId);
        parentNodeId = tree.getNodeParentId(parentNodeId); // two parents, I am looking for grandfather
        parentName = tree.getNodeName(parentNodeId);
        components.push(parentName);
        tree.enumNodeChildren(parentNodeId, function (child) {
            components.push(child);
        }, false);
        callback(components);
    });
}

var elementIsOpened = false;
var listOfOpenedElements = [];
var solidFragIdForAxis = [];

function getModifiedWorldBoundingBox(fragIds, fragList) {

    var fragbBox = new THREE.Box3();
    var nodebBox = new THREE.Box3();

    fragIds.forEach(function (fragId) {
        fragList.getWorldBounds(fragId, fragbBox);
        nodebBox.union(fragbBox);
    });

    return nodebBox;
}

function _animateElement(ids, startPosition, step, animationSelector) {
    const viewer = this.viewer;
    const it = viewer.model.getData().instanceTree;
    const meshes = [];

    for (var id of ids) {
        it.enumNodeFragments(id, function (fragId) {
            const mesh = viewer.impl.getFragmentProxy(viewer.model, fragId);
            mesh.scale = new THREE.Vector3(1, 1, 1);
            mesh.quaternion = new THREE.Quaternion(0, 0, 0, 1);
            mesh.position = new THREE.Vector3(0, 0, 0);
            meshes.push(mesh);
        }, true);
    }

    let counter = startPosition;
    var bBox = getModifiedWorldBoundingBox(solidFragIdForAxis, viewer.model.getFragmentList());

    var _timer = setInterval(function () {
        for (const mesh of meshes) {
            const deltaX = bBox.max.x - bBox.min.x;
            const deltaY = bBox.max.y - bBox.min.y;
            const deltaZ = bBox.max.z - bBox.min.z;
            const midX = (bBox.max.x + bBox.min.x) / 2;
            const midY = (bBox.max.y + bBox.min.y) / 2;
            const midZ = (bBox.max.z + bBox.min.z) / 2;
            const zAxisZpos = 0;
            const mainVector = new THREE.Vector3();

            if (deltaX < deltaZ) {
                // axis is along Z axis
                mainVector.set(0,0,1);
            } else {
                // axis is along X axis
                mainVector.set(1, 0, 0);
            }

            const mainAxisXpos = -midX;
            const mainAxisYpos = -midY;
            const mainMtrx = new THREE.Matrix4();

            if (animationSelector === "Leva") {
                // Animate left door
                const posMtrx = new THREE.Matrix4().setPosition(new THREE.Vector3(-mainAxisXpos, -mainAxisYpos, 0));
                const someMtrx = new THREE.Matrix4().setPosition(new THREE.Vector3(mainAxisXpos, mainAxisYpos, 0));
                posMtrx.multiply(mainMtrx.makeRotationAxis(mainVector, Math.PI * counter)).multiply(someMtrx);
                posMtrx.decompose(mesh.position, mesh.quaternion, mesh.scale);
            } else if (animationSelector === "Drawer") {
                // Animate drawer
                const posMtrx = new THREE.Matrix4().setPosition(new THREE.Vector3(0, 0, 0));
                posMtrx.makeTranslation(0, 1000 * counter, 0);
                posMtrx.decompose(mesh.position, mesh.quaternion, mesh.scale);
            } else if (animationSelector === "Desna") {
                // Animate right door
                const posMtrx = new THREE.Matrix4().setPosition(new THREE.Vector3(-mainAxisXpos, -mainAxisYpos, 0));
                const someMtrx = new THREE.Matrix4().setPosition(new THREE.Vector3(mainAxisXpos, mainAxisYpos, 0));
                posMtrx.multiply(mainMtrx.makeRotationAxis(mainVector, -Math.PI * counter)).multiply(someMtrx);
                posMtrx.decompose(mesh.position, mesh.quaternion, mesh.scale);
            }
            mesh.updateAnimTransform();
        }
        counter += step;
        viewer.impl.invalidate(true, true, true);
        if (counter < -0.505) {
            this.elementIsOpened = true;
            clearInterval(_timer);
        }
        if (counter > 0.05) {
            this.elementIsOpened = false;
            clearInterval(_timer);
        }
    }, 100);
}
