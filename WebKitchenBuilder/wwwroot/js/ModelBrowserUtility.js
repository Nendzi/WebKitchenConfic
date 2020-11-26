function animateSelectedElement() {
    const DOOR_PARTS = NOP_VIEWER.getSelection();
    if (DOOR_PARTS.length > 0) {
        var allElementsInAssembly = searchInOwnAssembly(DOOR_PARTS[0]);
        if (allElementsInAssembly.length > 1) {

            if (doorIsOpen) {
                doorIsOpen = false;

                doorChangesState = true;
                if (allElementsInAssembly[0].substr(0, 6) === "Drawer") {
                    _closeDrawer(allElementsInAssembly);
                } else {
                    _closeDoors(allElementsInAssembly);
                }
            }
            else {
                doorIsOpen = true;

                doorChangesState = true;
                if (allElementsInAssembly[0].substr(0, 6) === "Drawer") {                    
                    _openDrawer(allElementsInAssembly);
                } else {
                    _openDoors(allElementsInAssembly);
                }
            }
            NOP_VIEWER.clearSelection();
        }
    }
}

function searchInOwnAssembly(nodeId) {
    var componets = [];

    getNeightboreLeafComponentsFromLeaf(NOP_VIEWER, nodeId, function (dbIds) {
        //console.log('Found ' + dbIds.length + ' leaf nodes');
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
    var cbCount = 0; // count pending callbacks
    var components = []; // store the results
    var tree; // the instance tree
    var parentNodeId; // id of parant of input (selected) part
    var parentName;

    viewer.getObjectTree(function (objectTree) {
        tree = objectTree;

        parentNodeId = tree.getNodeParentId(selectedId);
        parentNodeId = tree.getNodeParentId(parentNodeId); // dva roditelja tj, dedu tražim.
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

function _openDoors(ids) {
    _animateDoors(ids, 0, -0.1, "Doors");
}

function _closeDoors(ids) {
    _animateDoors(ids, -0.5, 0.1,"Doors");
}

function _closeDrawer(ids) {
    _animateDoors(ids, -0.5, 0.1, "Drawer")
}

function _openDrawer(ids) {
    _animateDoors(ids, 0, -0.1, "Drawer")
}

function _disableAnimations() {
    clearInterval(this._timer);
}

function _animateDoors(ids, startPosition, step, animationSelector) {
    const viewer = this.viewer;
    const it = viewer.model.getData().instanceTree;
    //console.log(it);
    const axis = new THREE.Vector3(0, 1, 0);
    //console.log(axis);
    const meshes = [];

    //console.log(ids);
    for (var id of ids) {
        it.enumNodeFragments(id, function (fragId) {
            const mesh = viewer.impl.getFragmentProxy(viewer.model, fragId);
            //console.log(mesh);
            mesh.scale = new THREE.Vector3(1, 1, 1);
            mesh.quaternion = new THREE.Quaternion(0, 0, 0, 1);
            mesh.position = new THREE.Vector3(0, 0, 0);
            meshes.push(mesh);
        }, true);
    }

    let counter = startPosition;

    var _timer = setInterval(function () {
        for (const mesh of meshes) {

            const posMtrx = new THREE.Matrix4().setPosition(new THREE.Vector3(-299, -277, 0));
            //console.log(posMtrx);
            const someMtrx = new THREE.Matrix4().setPosition(new THREE.Vector3(299, 277, 0));
            const mainMtrx = new THREE.Matrix4();
            //console.log(mainMtrx);

            
            if (animationSelector === "Doors") {
                // Animate door
                posMtrx.multiply(mainMtrx.makeRotationZ(Math.PI * counter)).multiply(someMtrx);            
            } else if (animationSelector === "Drawer") {
                // Animate drawer
                posMtrx.multiply(mainMtrx.makeTranslation(0, 1000 * counter, 0)).multiply(someMtrx);
            }            
            //console.log(posMtrx);
            //mesh.quaternion.setFromAxisAngle(axis, Math.PI * counter);
            posMtrx.decompose(mesh.position, mesh.quaternion, mesh.scale);
            //mesh.quaternion.setFromRotationMatrix(posMtrx);
            mesh.updateAnimTransform();
        }
        counter += step;
        console.log(counter);
        viewer.impl.invalidate(true, true, true);
        if (counter < -0.5) {
            this.doorIsOpen = true;
            this.doorChangesState = false;
            clearInterval(_timer);
            //this._disableAnimations();
        }
        if (counter > 0) {
            this.doorIsOpen = false;
            this.doorChangesState = false;
            clearInterval(_timer);
            //this._disableAnimations();
        }
    }, 100);
}