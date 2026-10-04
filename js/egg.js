var EggPage = (function () {
  var SEQ = ["ArrowUp", "ArrowDown", "ArrowUp", "ArrowUp", "ArrowDown"];
  var buf = [];
  var timer = null;

  function reset() {
    buf = [];
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function open() {
    document.getElementById("egg-overlay").classList.add("open");
    render();
  }

  function close() {
    document.getElementById("egg-overlay").classList.remove("open");
  }

  function fillPeople() {
    var state = AppStore.load();
    var html = "";
    for (var i = 0; i < state.personnel.length; i++) {
      html += '<option value="' + state.personnel[i].id + '">' + Unit.title(state.personnel[i]) + "</option>";
    }
    document.getElementById("egg-person").innerHTML = html || '<option value="">인원 없음</option>';
  }

  function render() {
    var state = AppStore.load();
    fillPeople();
    var rows = "";
    var list = state.blunders.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      rows +=
        "<tr><td>" + b.date + "</td><td>" + Unit.title(Unit.findPerson(state, b.personId)) + "</td><td>" +
        b.text + '</td><td><button type="button" class="btn" data-edit-egg="' + b.id + '">수정</button> ' +
        '<button type="button" class="btn danger" data-del-egg="' + b.id + '">삭제</button></td></tr>';
    }
    document.getElementById("egg-body").innerHTML = rows || '<tr><td colspan="4" class="muted">아직 기록이 없습니다.</td></tr>';
  }

  function resetForm() {
    document.getElementById("egg-id").value = "";
    document.getElementById("egg-text").value = "";
    DatePicker.write(document.getElementById("egg-date"), "", "", false);
  }

  function init() {
    DatePicker.bindField(document.getElementById("egg-date"), { title: "발생일" });
    document.getElementById("egg-close").onclick = close;
    document.getElementById("egg-overlay").addEventListener("click", function (e) {
      if (e.target.id === "egg-overlay") close();
    });
    document.getElementById("egg-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var id = document.getElementById("egg-id").value || AppStore.uid("bl");
      var personId = document.getElementById("egg-person").value;
      var date = DatePicker.read(document.getElementById("egg-date")).start;
      var text = document.getElementById("egg-text").value.trim();
      if (!personId || !date || !text) {
        alert("날짜, 대상, 내용을 넣으세요.");
        return;
      }
      AppStore.update(function (s) {
        var idx = -1;
        for (var i = 0; i < s.blunders.length; i++) {
          if (s.blunders[i].id === id) idx = i;
        }
        var row = { id: id, personId: personId, date: date, text: text };
        if (idx === -1) s.blunders.push(row);
        else s.blunders[idx] = row;
      });
      resetForm();
    });
    document.getElementById("egg-body").addEventListener("click", function (e) {
      var editId = e.target.getAttribute("data-edit-egg");
      var delId = e.target.getAttribute("data-del-egg");
      var state = AppStore.load();
      if (editId) {
        for (var i = 0; i < state.blunders.length; i++) {
          if (state.blunders[i].id === editId) {
            var b = state.blunders[i];
            document.getElementById("egg-id").value = b.id;
            document.getElementById("egg-person").value = b.personId;
            document.getElementById("egg-text").value = b.text;
            DatePicker.write(document.getElementById("egg-date"), b.date, b.date, false);
          }
        }
      }
      if (delId && confirm("이 기록을 삭제할까요?")) {
        AppStore.update(function (s) {
          s.blunders = s.blunders.filter(function (x) { return x.id !== delId; });
        });
      }
    });
    document.addEventListener("keydown", function (e) {
      var tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (SEQ.indexOf(e.key) === -1) {
        reset();
        return;
      }
      e.preventDefault();
      buf.push(e.key);
      if (timer) clearTimeout(timer);
      timer = setTimeout(reset, 2000);
      for (var i = 0; i < buf.length; i++) {
        if (buf[i] !== SEQ[i]) {
          buf = e.key === SEQ[0] ? [e.key] : [];
          return;
        }
      }
      if (buf.length === SEQ.length) {
        reset();
        open();
      }
    });
    AppEvents.on("data", function () {
      if (document.getElementById("egg-overlay").classList.contains("open")) render();
    });
  }

  return { init: init, open: open };
})();
