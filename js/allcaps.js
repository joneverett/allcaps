/***
           DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
                   Version 2, December 2004

Copyright (C) 2004 Sam Hocevar <sam@hocevar.net>

Everyone is permitted to copy and distribute verbatim or modified
copies of this license document, and changing it is allowed as long
as the name is changed.

           DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
  TERMS AND CONDITIONS FOR COPYING, DISTRIBUTION AND MODIFICATION

 0. You just DO WHAT THE FUCK YOU WANT TO.
***/
// CONFIG
var AUTOZOOM = false;
var GAME_MINUTES = 4;
var ANIMATION_DURATION = 3;
var LANGUAGE = "nb";  // nb | en
var IGNORE_DIACRITICS = true;

// GLOBALS
var targetSVG = "M9,0C4.029,0,0,4.029,0,9s4.029,9,9,9s9-4.029,9-9S13.971,0,9,0z M9,15.93 c-3.83,0-6.93-3.1-6.93-6.93S5.17,2.07,9,2.07s6.93,3.1,6.93,6.93S12.83,15.93,9,15.93 M12.5,9c0,1.933-1.567,3.5-3.5,3.5S5.5,10.933,5.5,9S7.067,5.5,9,5.5 S12.5,7.067,12.5,9z";
var planeSVG = "m2,106h28l24,30h72l-44,-133h35l80,132h98c21,0 21,34 0,34l-98,0 -80,134h-35l43,-133h-71l-24,30h-28l15,-47";

var gameset;
var successes;
var progress;
var all_capitals;
var current_cap;
var countdown_timer_id;
var countdown_bar;
var progress_bar;
var game_mode;
var bust_on_wrong;
var failed;

var plane_image = {
    svgPath: planeSVG,
    color: "#585869",
    alpha: 0.8,
    animationDuration: ANIMATION_DURATION,
    loop: false,
    scale: 0.09,
    positionScale: 1.3,
    positionOnLine: 0
};

var worldDataProvider = {
    map: "worldLow",
    getAreasFromMap: true
};

var map = AmCharts.makeChart("mapdiv", {
    type: "map",
    theme: "light",
    projection: "eckert3",
    dataProvider: worldDataProvider,
    areasSettings: {
        autoZoom: AUTOZOOM
    },
    zoomControl: {
        minZoomLevel: 1,
        maxZoomLevel: 10,
        top: 80
    },
    zoomDuration: ANIMATION_DURATION
});

if (AUTOZOOM) {
    map.smallMap = {
        size: 0.3,
        backgroundAlpha: 0.5,
        mapColor: "#eeeeee"
    };
}

function shuffleArray(array) {
    var i;
    for (i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}

function set_language(lang) {
    LANGUAGE = lang;
    if (lang === "nb") {
        $(":lang(nb)").show();
        $(":lang(en)").hide();
        map.language = lang;
    } else if (lang === "en") {
        $(":lang(en)").show();
        $(":lang(nb)").hide();
        map.language = null;
    }
    var selected = map.selectedObject;
    map.validateData();
    map.selectObject(selected);
}

function stop_timer() {
    clearInterval(countdown_timer_id);
}

function start_timer(minutes) {
    var duration = minutes * 60;
    var timer = duration;
    var minute;
    var second;

    countdown_timer_id = setInterval(function () {
        minute = parseInt(timer / 60, 10);
        second = parseInt(timer % 60, 10);

        minute = minute < 10 ? "0" + minute : minute;
        second = second < 10 ? "0" + second : second;

        countdown_bar.animate(timer / duration, function () {
            countdown_bar.setText(minute + ":" + second);
            if (--timer < 0) {
                stop_timer();
                end_travel();
            }
        });
    }, 1000);
}

function is_game_completed() {
    if (progress === gameset.length) {
        return true;
    }
    return false;
}

function set_progbar() {
    var text;
    if (game_mode === 2) {
        text = successes + "/" + gameset.length;
    } else {
        text = gameset.length;
    }

    progress_bar.animate(successes / gameset.length, function () {
        progress_bar.setText(text);
    });
    if (!bust_on_wrong) {
        countdown_bar.setText(failed.length);
    }
}

function add_gameset_rule() {
    var rule = $("#input_field_nb").val() + $("#input_field_en").val();
    gameset.push({
        "id": current_cap.id,
        "country": current_cap.country,
        "capital": current_cap.capital,
        "latitude": current_cap.latitude,
        "longitude": current_cap.longitude,
        "rule": rule
    });
    var country = map.getObjectById(current_cap.id);
    country.color = "#f15135";  // ammap red
    $("input").val("");
    set_progbar();
}

function clear_labels_lines() {
    worldDataProvider.images.forEach(function (item) {
        item.label = "";
    });
    worldDataProvider.lines = [];
    map.validateData();
}

function prepare_answer() {
    var game = gameset[progress];
    var msg_nb = "Hovedstaden i " + game.country.nb;
    var msg_en = "The capital of " + game.country.en;
    $("#form_label_nb").html(msg_nb);
    $("#form_label_en").html(msg_en);
    $("input").attr("placeholder", game.rule);
    $("input:visible").focus();
    // plane_image.animateTo(game.longitude, game.latitude, ANIMATION_DURATION);
    var country = map.getObjectById(game.id);
    map.selectObject(country);
}

function set_mode_intro() {
    game_mode = 0;
    $("#intro_col").show();
    $("#form_col").hide();
    $("#prog_col").hide();

    $("#listdiv ul").empty();
    map.dataProvider.images = [];
    map.validateData();
}

function set_mode_in() {
    set_language(LANGUAGE);  // for unknown reason this breaks the other language form button if called too early..
    game_mode = 1;
    $("#form_col").show();
    $("#prog_col").show();
    $("#intro_col").hide();
    var msg = "<span class=\"glyphicon glyphicon-step-forward\" aria-hidden=\"true\"></span>";
    $(".btn-primary").html(msg);
    $("input").val("");
    $("input").prop('disabled', false);
    $("#input_field_nb").attr("placeholder", "Lag huskeregel");
    $("#input_field_en").attr("placeholder", "Create rule of thumb");
    $("input:visible").focus();
    $(".has-feedback").removeClass("has-success");
    $(".has-feedback").removeClass("has-error");

}

function set_mode_out() {
    game_mode = 2;
    set_progbar();
    stop_timer();
    clear_labels_lines();
}

function set_mode_end(successful) {
    game_mode = 3;
    var btn_text = "<span class=\"glyphicon glyphicon-refresh\" aria-hidden=\"true\"></span>";
    $(".btn-primary").html(btn_text);
    $("input").prop('disabled', true);

    map.dataProvider.zoomLevel = 1;
    map.dataProvider.zoomLatitude = 0;
    map.dataProvider.zoomLongitude = 0;
    map.selectObject();  // zoom out
    if (AUTOZOOM) {
        map.smallMap.minimize();
    }

    if (successful) {
        $(".has-feedback").addClass("has-success");
        $("input").attr("placeholder", "");
    } else {
        $(".has-feedback").addClass("has-error");
    }
    $("button:visible").focus();
}

function set_correct_answer() {
    $("input").val("");
    $(".has-feedback").toggleClass("has-success");
    setTimeout(function () {
        $(".has-feedback").toggleClass("has-success");
    }, 2000);
}

function answer_accepted(game) {
    var answer = game.capital[LANGUAGE];
    var entry = $("#input_field_nb").val() + $("#input_field_en").val();

    var entry_san = entry.toLowerCase();
    var answer_san = answer.toLowerCase();
    if (IGNORE_DIACRITICS) {
        entry_san = removeDiacritics(entry_san);
        answer_san = removeDiacritics(answer_san);
    }
    var score = new difflib.SequenceMatcher(answer_san, entry_san).ratio();
    if (score > 0.85) {
        return true;
    }
    return false;

}

function check_answer() {
    var game = gameset[progress];

    if (answer_accepted(game)) {
        successes += 1;
        progress += 1;
        set_correct_answer();

        // set country color
        var cnt = map.getObjectById(game.id);
        if (bust_on_wrong) {
          cnt.color = "#5cb85c";  // success green
        } else {
          cnt.color = "#e0e0e0";  // background
        }
        cnt.validate();
    } else {
        if (bust_on_wrong) {
            set_mode_end(false);
            var msg = "<span class=\"glyphicon glyphicon-remove\" aria-hidden=\"true\"></span>";
            var msg_nb = msg + " Hovedstaden i " + game.country.nb + "<i> er " + game.capital.nb + "</i>";
            var msg_en = msg + " The capital of " + game.country.en + "<i> is " + game.capital.en + "</i>";
            $("#form_label_nb").html(msg_nb);
            $("#form_label_en").html(msg_en);
        } else {
            $("input").val("");
            $(".has-feedback").toggleClass("has-error");
            setTimeout(function () {
                $(".has-feedback").toggleClass("has-error");
            }, 2000);
            failed.push(game);
            var msg = game.country[LANGUAGE] + ' - ' + game.capital[LANGUAGE];
            $("#listdiv ul").append('<li>' + msg + '</li>');

            progress += 1;
        }
    }
    set_progbar();

    if (game_mode === 3) {
        return;
    } else if (is_game_completed()) {
        set_mode_end(true);
        var msg = "<span class=\"glyphicon glyphicon-ok\" aria-hidden=\"true\"></span>";
        var msg_nb = msg + " Memorert " + successes + " hovedsteder!";
        var msg_en = msg + " Memorized " + successes + " capitals!";
        $("#form_label_nb").html(msg_nb);
        $("#form_label_en").html(msg_en);
    } else {
        prepare_answer();
    }
}

function end_travel() {
    if (is_game_completed()) {
        // timed out without any input
        set_mode_intro();
        return;
    }
    map.validateData();
    set_mode_out();
    prepare_answer();
}

function clicked_end() {
    if (game_mode === 1) {
        add_gameset_rule();
        end_travel();
    }
}

function goto_rand() {
    var capital = all_capitals.pop();
    // TODO: Handle empty array.
    var country = map.getObjectById(capital.id);
    capital.svgPath = targetSVG;
    capital.label = capital.capital[LANGUAGE];

    var label_nb = capital.capital.nb + " er hovedstad i " + capital.country.nb;
    var label_en = capital.capital.en + " is the capital of " + capital.country.en;
    $("#form_label_nb").html(label_nb);
    $("#form_label_en").html(label_en);

    map.dataProvider.images.push(capital);
    if (current_cap) {
        var line_id = "line" + gameset.length;
        worldDataProvider.lines = [{
            id: line_id,
            arc: -0.55,
            alpha: 0.8,
            latitudes: [current_cap.latitude, capital.latitude],
            longitudes: [current_cap.longitude, capital.longitude]
        }];
        plane_image.animateAlongLine = true;
        plane_image.lineId = line_id;
    } else {
        plane_image.animateTo(capital.longitude, capital.latitude, ANIMATION_DURATION);
    }
    // store in global variable
    current_cap = capital;

    // set same zoom levels to retain map position/zoom
    map.dataProvider.zoomLevel = map.zoomLevel();
    map.dataProvider.zoomLatitude = map.zoomLatitude();
    map.dataProvider.zoomLongitude = map.zoomLongitude();

    map.validateData();
    map.selectObject(country);
}

function start_exhaust() {
    failed = [];
    bust_on_wrong = false;
    all_capitals = capitals_low.slice(0);  // copy
    shuffleArray(all_capitals);
    gameset = all_capitals;
    successes = 0;
    progress = 0;
    set_progbar();

    set_mode_in();
    set_mode_out();

    prepare_answer();
}

function start_compete() {
    set_mode_in();

    // reset globals
    gameset = [];
    successes = 0;
    progress = 0;
    current_cap = false;
    bust_on_wrong = true;
    all_capitals = capitals_low.slice(0);  // copy
    shuffleArray(all_capitals);
    stop_timer();
    start_timer(GAME_MINUTES);
    set_progbar();

    map.dataProvider.lines = [];
    map.dataProvider.images = [plane_image];
    map.validateData();

    goto_rand();
}

function next_cap() {
    add_gameset_rule();
    goto_rand();
}

function form_btn_clicked() {
    if (game_mode === 0) {
        start_compete();
    } else if (game_mode === 1) {
        next_cap();
    } else if (game_mode === 2) {
        check_answer();
    } else if (game_mode === 3) {
        set_mode_intro();
    } else {
        console.log("invalid game mode: " + game_mode);
    }
}

// initialize allcaps.html
$(document).on("ready", function () {
    $("#compete_btn").focus();
    $("#compete_btn").bind("click", start_compete);
    $("#exhaust_btn").bind("click", start_exhaust);
    $(".btn-primary").bind("click", form_btn_clicked);
    $("input").keypress(function (e) {
        if (e.which === 13) {
            form_btn_clicked();
        }
    });

    countdown_bar = new ProgressBar.Circle(document.getElementById('countdown'), {
        duration: 200,
        color: "#000",
        fill: "#f15135",  // ammap red
        trailColor: "#ddd",
        strokeWidth: 8,
        text: {
            style: {
                color: "#fff"
            }
        }
    });
    progress_bar = new ProgressBar.Circle(document.getElementById('progress'), {
        duration: 200,
        color: "#000",
        fill: "#5cb85c",  // success green
        trailColor: "#ddd",
        strokeWidth: 8,
        text: {
            style: {
                color: "#fff"
            }
        }
    });
    $("#countdown").bind("click", clicked_end);
    $(".flag-icon-gb").click(function () {set_language("en");});
    $(".flag-icon-no").click(function () {set_language("nb");});

    set_mode_intro();
});
