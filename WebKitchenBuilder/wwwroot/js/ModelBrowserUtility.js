function animateSelectedElement() {
    const DOOR_PARTS = NOP_VIEWER.getSelection();
    if (DOOR_PARTS.length > 0) {
        var allElementsInAssembly = searchInOwnAssembly(DOOR_PARTS[0]);
        if (allElementsInAssembly.length > 2) {

            if (doorIsOpen) {
                doorIsOpen = false;
                // elements closing
                doorChangesState = true;
                if (allElementsInAssembly[0].substr(0, 6) === "Drawer") {
                    _animateElement(allElementsInAssembly, -0.5, 0.1, "Drawer");
                } else if (allElementsInAssembly[0].substr(0, 4) === "Leva") {
                    _animateElement(allElementsInAssembly, -0.5, 0.1, "Leva");
                } else if (allElementsInAssembly[0].substr(0, 5) === "Desna") {
                    _animateElement(allElementsInAssembly, -0.5, 0.1, "Desna");
                }
            }
            else {
                doorIsOpen = true;
                // elements opening
                doorChangesState = true;
                if (allElementsInAssembly[0].substr(0, 6) === "Drawer") {
                    _animateElement(allElementsInAssembly, 0, -0.1, "Drawer");
                } else if (allElementsInAssembly[0].substr(0, 4) === "Leva") {
                    _animateElement(allElementsInAssembly, 0, -0.1, "Leva");
                } else if (allElementsInAssembly[0].substr(0, 5) === "Desna") {
                    _animateElement(allElementsInAssembly, 0, -0.1, "Desna");
                }
            }
            NOP_VIEWER.clearSelection();
        }
    }
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
    var tree; // the instance tree
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

doorIsOpen = false;
doorChangesState = false;

function _animateElement(ids, startPosition, step, animationSelector) {
    const viewer = this.viewer;
    const it = viewer.model.getData().instanceTree;
    const axis = new THREE.Vector3(0, 1, 0);
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

    var _timer = setInterval(function () {
        for (const mesh of meshes) {
            const halfWidth = viewer.model.getBoundingBox(false);
            const zAxisXpos = halfWidth.max.x - 1;// 299;
            const zAxisYpos = 277;

            const mainMtrx = new THREE.Matrix4();

            if (animationSelector === "Leva") {
                // Animate left door
                const posMtrx = new THREE.Matrix4().setPosition(new THREE.Vector3(-zAxisXpos, -zAxisYpos, 0));
                const someMtrx = new THREE.Matrix4().setPosition(new THREE.Vector3(zAxisXpos, zAxisYpos, 0));
                posMtrx.multiply(mainMtrx.makeRotationZ(Math.PI * counter)).multiply(someMtrx);
                posMtrx.decompose(mesh.position, mesh.quaternion, mesh.scale);
            } else if (animationSelector === "Drawer") {
                // Animate drawer
                const posMtrx = new THREE.Matrix4().setPosition(new THREE.Vector3(0, 0, 0));
                posMtrx.makeTranslation(0, 1000 * counter, 0);
                posMtrx.decompose(mesh.position, mesh.quaternion, mesh.scale);
            } else if (animationSelector === "Desna") {
                // Animate right door
                const posMtrx = new THREE.Matrix4().setPosition(new THREE.Vector3(zAxisXpos, -zAxisYpos, 0));
                const someMtrx = new THREE.Matrix4().setPosition(new THREE.Vector3(-zAxisXpos, zAxisYpos, 0));
                posMtrx.multiply(mainMtrx.makeRotationZ(-Math.PI * counter)).multiply(someMtrx);
                posMtrx.decompose(mesh.position, mesh.quaternion, mesh.scale);
            }
            mesh.updateAnimTransform();
        }
        counter += step;
        viewer.impl.invalidate(true, true, true);
        if (counter < -0.505) {
            this.doorIsOpen = true;
            this.doorChangesState = false;
            clearInterval(_timer);
        }
        if (counter > 0.05) {
            this.doorIsOpen = false;
            this.doorChangesState = false;
            clearInterval(_timer);
        }
    }, 100);
}
