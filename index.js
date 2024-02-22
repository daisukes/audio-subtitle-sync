function init() {
    document.getElementById('dirPicker').addEventListener('change', checkFiles);
    document.addEventListener('keydown', keyDown);
    checkFiles();
}

function keyDown(event) {
    console.log(event);
    console.log(`Key pressed: ${event.key}`);

    if(event.key === "ArrowDown") {
        event.preventDefault();
        playAudioAt(srtIndex+1);
    }
    if(event.key === "ArrowUp") {
        event.preventDefault();
        playAudioAt(srtIndex-1);
    }
}


function checkFiles(event) {
    const files = event ? event.target.files : document.getElementById('dirPicker').files;
    const fileURLs = {};
    const pairs = [];
    
    for (const file of files) {
        const name = file.name;
        const baseName = name.split('.').slice(0, -1).join('.');
        const extension = name.split('.').pop().toLowerCase();
	
        if (extension === 'mp3' || extension === 'srt') {
            if (!pairs[baseName]) {
                pairs[baseName] = {mp3: null, srt: null};
            }
            pairs[baseName][extension] = name;

            const fileURL = URL.createObjectURL(file);
            fileURLs[name] = fileURL;
        }
    }
    
    const list = document.getElementById('fileList');
    list.innerHTML = ''; // Clear existing list

    const sortedKeys = Object.keys(pairs).sort();
    sortedKeys.forEach(baseName => {
        if (pairs[baseName].mp3 && pairs[baseName].srt) {
            const listItem = document.createElement('li');
            listItem.textContent = `${baseName}`;
            listItem.dataset.mp3Url = fileURLs[pairs[baseName].mp3];
            listItem.dataset.srtUrl = fileURLs[pairs[baseName].srt];
            list.appendChild(listItem);

            listItem.addEventListener('click', showContent);
        }
    });
}

function showContent(event) {
    console.log('click');
    const audioPlayer = document.getElementById('audioPlayer');
    audioPlayer.src = this.dataset.mp3Url;
    audioPlayer.style.display = 'block';
    //audioPlayer.play();
    
    const list = document.getElementById('fileList');
    list.querySelectorAll("li").forEach(e => {
        e.classList.remove("selected");
    });
    this.classList.add("selected");
    displaySrtContent(this.dataset.srtUrl);
}

var srtData = [];
var srtIndex = 0;

async function displaySrtContent(srtUrl) {
    const displayElementId = 'srt';
    const response = await fetch(srtUrl);
    const srtContent = await response.text();
    
    const parseSrt = (srt) => {
        return srt.split('\n\n').map(block => {
            if (block == "") {
                return null;
            }
            const [index, time, ...textLines] = block.split('\n');
            const [startTime, endTime] = time.split(' --> ');
            return { index, startTime, endTime, text: textLines.join('\n') };
        });
    };

    srtData = parseSrt(srtContent);
    srtIndex = -1;
    const displayElement = document.getElementById(displayElementId);

    displayElement.innerHTML = ''; // Clear existing content
    srtData.forEach((item) => {
        if (item == null) { return; }
        const { index, startTime, endTime, text } = item
        const element = document.createElement('div');
        element.innerHTML = `<span class="nowrap">${startTime} --> ${endTime}: ${text}</span>`;
        element.dataset.index = index;
        displayElement.appendChild(element);
        element.addEventListener('click', playAudio);
    });
    playAudioAt(0);
}

function selectAt(index) {
    srtIndex = index;
    console.log(srtIndex);
    const displayElementId = 'srt';
    const displayElement = document.getElementById(displayElementId);
    const elements = displayElement.querySelectorAll("div");
    elements.forEach(e => {
        e.classList.remove('selected');
    });
    elements[index].classList.add('selected');
    elements[index].scrollIntoView({behavior: "smooth", block: "center"});
}

function playAudio(e) {
    playAudioAt(this.dataset.index-1);
}

function playAudioAt(index) {
    if (0 <= index && index < srtData.length) {
        if (srtIndex == index) {
            return;
        }        
        const {startTime} = srtData[index]
        playAudioSegment("audioPlayer", startTime);
        selectAt(index);
    }
}

function parseTime(timeString) {
    const [hours, minutes, seconds] = timeString.split(':');
    const [sec, msec] = seconds.split(',');
    return Number(hours) * 3600 + Number(minutes) * 60 + Number(sec) + Number(msec) / 1000;
}

function playAudioSegment(audioId, start) {
    const audioPlayer = document.getElementById(audioId);
    const startTime = parseTime(start);
    if (Math.abs(audioPlayer.currentTime - startTime) < 0.1) {
        return;
    }
    audioPlayer.currentTime = startTime;
    audioPlayer.play();
}

setInterval(() => {
    const audioPlayer = document.getElementById('audioPlayer');
    if (audioPlayer && srtData) {
        var maxi = 0;
        for(var i = 0; i < srtData.length; i++) {
            if (srtData[i] == null) { continue; }
            time = parseTime(srtData[i].startTime);
            if (time <= audioPlayer.currentTime) {
                maxi = i;
            }
        }
        playAudioAt(maxi);
    }
}, 10);
