const { shell } = require('electron');

(function () {
    function init() {
        var ipcRenderer = require('electron').ipcRenderer;
        var currentWindow = require('electron').remote.getCurrentWindow();

        // Minimize task
        if (document.getElementById("min-btn") != null) {
            document.getElementById("min-btn").addEventListener("click", (e) => {
                currentWindow.minimize();
            });
        }
        // Close app
        if (document.getElementById("close-btn") != null) {
            document.getElementById("close-btn").addEventListener("click", (e) => {
                console.log("click button");
                currentWindow.close();
            });

        }
    }
    document.onreadystatechange = () => {
        if (document.readyState == "complete") {
            init();
        }
    };
})();




