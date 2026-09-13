// to be ran after brstm.js is loaded // --- music player functions

var userPrefs = {
    "cookies": false,
    "fullscreen": false,
    "freaky": false,
    "loopMusic": true,
    "volume": .2,
}

const DEFAULT_SONG = "Hourglass Meadow"
const RANDOM_SONG_POOL = ["10444", "113524", "30346", "96248", "Hourglass Meadow"]
const CHILL_SONG_POOL = []
const LAST_SONG_DEPTH = 3
var lastSongPool = []

var nowPlaying = null
//template: "id":{title:"",game:""},

const musicLibrary = {
    "5875":{
        title:"Gateway Galaxy - Medley",
        game:"Super Mario Galaxy"
    },
    "26963": {
        title: "Craggy Coast",
        game: "PMD: Explorers of Time & Darkness"
    },
    "22154": {
        title: "File Select",
        game: "Mario & Luigi: Superstar Saga"
    },
    "52560": {
        title: "Tranquility",
        game: "9 Hours, 9 Persons, 9 Doors"
    },
    "73499": {
        title: "Geothermal",
        game: "Cave Story"
    },
    "10444": {
        title: "Central City",
        game: "Sonic Battle",
    },
    "113524": {
        title: "TV WORLD",
        game: "DELTARUNE Chapters 3+4",
    },
    "60570": {
        title: "You've Come Far (Coffee Break)",
        game: "Earthbound",
    },
    "30346": {
        title: "Disco Kid (Pause)",
        game: "Punch-Out!! (Wii)",
    },
    "96248": {
        title: "WELCOME TO THE CITY",
        game: "DELTARUNE Chapter 2",
    },
    "114110": {
        title: "Catswing",
        game: "Deltarune Chapters 3 + 4",
    },

    "86844": {
        title: "Acid Hues [Off the Hook]",
        game: "Splatoon 2",
    },
    "Hourglass Meadow": {
        title: "Temptation Stairway",
        game: "Hourglass Meadow",
    },
}

function handlePlayback() {
    if (nowPlaying == null) {
        playSong(DEFAULT_SONG);




    } else {
        window.player.togglePlayback()

    }

}

function saveVolumeChange() {
    userPrefs.volume = document.getElementById("music-player-volume-cont").children[0].value / 100
    //savePreferences()
}

function addToLastPlayed(song) {
    if (lastSongPool.unshift(song) > LAST_SONG_DEPTH) lastSongPool.pop()
}

function playSong(id) {
    if (userPrefs.volume == null) userPrefs.volume = .2
    //savePreferences()
    window.player.volume.set(userPrefs.volume)

    nowPlaying = musicLibrary[id]
    addToLastPlayed(id)
    window.player.play(`/res/music/${id}.brstm`)
}

function playRandom(pl = null) {
    if (pl == null) pl = RANDOM_SONG_POOL

    var randomSong = pl[Math.floor(Math.random() * pl.length)];
    do {
        randomSong = pl[Math.floor(Math.random() * pl.length)];
    } while (lastSongPool.includes(randomSong));
    playSong(randomSong);
}

function toggleLooping() {
    if (userPrefs.loopMusic == null) userPrefs.loopMusic = true
    console.log(userPrefs.loopMusic)
    if (userPrefs.loopMusic) {
        window.player.setLoop(false);
        userPrefs.loopMusic = false
    } else {
        window.player.setLoop(true);
        userPrefs.loopMusic = true
    }
    updateMusicGUI()
    //savePreferences()
}

function updateMusicGUI() {

    //current pos
    const currentPosition = window.player.progress.currentSample / window.player.progress.totalSamples
    document.getElementById("music-player-bar-current").style.width = `calc(100% * ${currentPosition})`

    //loop area
    const loopPos = window.player.metadata.loopLocation / window.player.progress.totalSamples * 100;
    if (window.player.looping) {
        document.getElementById("music-player-bar-bg").style.backgroundImage =
            `linear-gradient(90deg, rgb(from var(--color-magenta) r g b /.25) calc(${loopPos}%), transparent calc(${loopPos}% + 20px))`
        document.getElementById("music-player-bar-loop-count").innerText = `loops: ${window.player.loops}`
    } else {
        document.getElementById("music-player-bar-bg").style.backgroundImage = "unset"
        document.getElementById("music-player-bar-loop-count").innerText = ``
    }

    //current and end time
    const currentTime = new Date(Math.ceil(window.player.progress.currentSample / window.player.metadata
        .sampleRate) * 1000).toISOString().substring(14, 19)
    const endTime = new Date(Math.ceil(window.player.progress.totalSamples / window.player.metadata
        .sampleRate) * 1000).toISOString().substring(14, 19)
    document.getElementById("music-player-bar-time-now").innerText = currentTime
    document.getElementById("music-player-bar-time-end").innerText = endTime

    //play pause
    if (window.player.paused) {
        document.getElementById("music-player-playback").children[0].src = "/res/img/icon/svg/play.svg"
    } else {
        document.getElementById("music-player-playback").children[0].src = "/res/img/icon/svg/pause.svg"
    }

    //volume
    window.player.volume.set(document.getElementById("music-player-volume-cont").children[0].value / 100)

    // music label
    nowPlaying ? document.getElementById("music-player-label").innerText =
        `${nowPlaying.game} - ${nowPlaying.title}` : document.getElementById("music-player-label").innerText =
        ""

}

function stopPlaying() {
    nowPlaying = null
    window.player.togglePlayback(true)
    window.player.seek(0)
}
