var viewer;
var sceneBuilder = null;
var modelBuilder = null;

function launchViewer(urn) {
    var options = {
        env: 'AutodeskProduction',
        getAccessToken: getForgeToken
    };

    Autodesk.Viewing.Initializer(options, () => {
        viewer = new Autodesk.Viewing.GuiViewer3D(document.getElementById('forgeViewer'),
            { extensions: ['Autodesk.DocumentBrowser'] }); //,'HandleSelectionExtension','ModelSummaryExtension', 'MyAwesomeExtension'
        viewer.setTheme('light-theme');        
        viewer.start();
        viewer.setLightPreset(18);
        var documentId = 'urn:' + urn;
        //viewer.addEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, animateSelectedElement);
        Autodesk.Viewing.Document.load(documentId, onDocumentLoadSuccess, onDocumentLoadFailure);
    });
}

function onDocumentLoadSuccess(doc) {

    var geometryItems = doc.getRoot().search({ "role": "3d", "type": "geometry" });

    // Try 3D first
    if (geometryItems.length < 1) {
        geometryItems.push(doc.getRoot().getDefaultGeometry())
    }

    viewer.loadDocumentNode(doc, geometryItems[0]).then(i => {
        // documented loaded, any action?
    });
}

function onDocumentLoadFailure(viewerErrorCode) {
    console.error('onDocumentLoadFailure() - errorCode:' + viewerErrorCode);
}

function getForgeToken(callback) {
    fetch('/api/forge/oauth/token').then(res => {
        res.json().then(data => {
            callback(data.access_token, data.expires_in);
        });
    });
}