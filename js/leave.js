var LeavePage = (function () {
  var monthKey = DateUtil.monthKey(new Date());

  function setMonth(next) {
    monthKey = next;
    render();
  }

  function fillPeople() {
    var state = AppStore.load();
    var el = document.getElementById("leave-person");
    var html = "";
    for (var i = 0; i < state.personnel.length; i++) {
      var p = state.personnel[i];
      html += '<option value="' + p.id + '">' + Unit.title(p) + " · " + p.platoon + "소대</option>";
    }
    el.innerHTML = html || '<option value="">인원 없음</option>';
  }

  function wouldExceed(state, start, end, ignoreId) {
    var cap = Unit.dailyLeaveCap(state);
    var days = DateUtil.eachDay(start, end);
    for (var i = 0; i < days.length; i++) {
      var ids = {};
      var leaves = Unit.confirmedLeaves(state);
      for (var j = 0; j < leaves.length; j++) {
        var lv = leaves[j];
        if (ignoreId && lv.id === ignoreId) continue;
        if (DateUtil.inRange(days[i], lv.start, lv.end)) ids[lv.personId] = true;
      }
      if (Object.keys(ids).length + 1 > cap) return true;
    }
    return false;
  }

  function promoteHolds() {
    AppStore.update(function (state) {
      var holds = state.leaveRequests
        .filter(function (r) { return r.status === "hold"; })
        .sort(function (a, b) { return a.createdAt - b.createdAt; });
      for (var i = 0; i < holds.length; i++) {
        if (!wouldExceed(state, holds[i].start, holds[i].end, holds[i].id)) {
          holds[i].status = "confirmed";
        }
      }
    });
  }

  function addRequest() {
    var personId = document.getElementById("leave-person").value;
    var range = DatePicker.read(document.getElementById("leave-range"));
    var type = document.getElementById("leave-type").value;
    if (!personId || !range.start || !range.end) {
      alert("인원과 기간을 고르세요.");
      return;
    }
    AppStore.update(function (state) {
      var req = {
        id: AppStore.uid("lv"),
        personId: personId,
        start: range.start,
        end: range.end,
        type: type,
        status: wouldExceed(state, range.start, range.end) ? "hold" : "confirmed",
        createdAt: Date.now()
      };
      state.leaveRequests.push(req);
    });
    DatePicker.write(document.getElementById("leave-range"), "", "", true);
  }

  function compileMonth() {
    if (!confirm(DateUtil.monthLabel(monthKey) + " 확정 희망자를 휴가 리스트로 옮길까요? 보류는 남습니다.")) return;
    AppStore.update(function (state) {
      var keep = [];
      var compiled = state.leaveLists[monthKey] ? state.leaveLists[monthKey].slice() : [];
      for (var i = 0; i < state.leaveRequests.length; i++) {
        var r = state.leaveRequests[i];
        var overlaps = DateUtil.rangesOverlap(r.start, r.end, monthKey + "-01", monthKey + "-" + DateUtil.pad(DateUtil.daysInMonth(monthKey)));
        if (r.status === "confirmed" && overlaps) compiled.push(r);
        else keep.push(r);
      }
      state.leaveRequests = keep;
      state.leaveLists[monthKey] = compiled;
    });
  }

  function requestRows(state) {
    var last = monthKey + "-" + DateUtil.pad(DateUtil.daysInMonth(monthKey));
    var rows = "";
    var list = state.leaveRequests.slice().sort(function (a, b) { return a.start < b.start ? -1 : 1; });
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if (!DateUtil.rangesOverlap(r.start, r.end, monthKey + "-01", last) && r.start.slice(0, 7) !== monthKey) continue;
      var person = Unit.findPerson(state, r.personId);
      rows +=
        "<tr>" +
        "<td>" + Unit.title(person) + "</td>" +
        "<td>" + r.start + "</td>" +
        "<td>" + r.end + "</td>" +
        "<td>" + r.type + "</td>" +
        '<td><span class="badge ' + (r.status === "hold" ? "hold" : "ok") + '">' + (r.status === "hold" ? "보류" : "확정") + "</span></td>" +
        '<td><button type="button" class="btn danger" data-del-req="' + r.id + '">삭제</button></td>' +
        "</tr>";
    }
    return rows || '<tr><td colspan="6" class="muted">이 달 희망자가 없습니다.</td></tr>';
  }

  function matrix(state) {
    var days = DateUtil.daysOfMonth(monthKey);
    var items = state.leaveLists[monthKey] || [];
    var byPerson = {};
    var i;
    for (i = 0; i < items.length; i++) {
      var it = items[i];
      if (!byPerson[it.personId]) byPerson[it.personId] = [];
      byPerson[it.personId].push(it);
    }
    var ids = Object.keys(byPerson);
    if (!ids.length) {
      document.getElementById("leave-list-empty").hidden = false;
      document.getElementById("leave-matrix").innerHTML = "";
      return;
    }
    document.getElementById("leave-list-empty").hidden = true;
    var head = '<tr><th class="name">성명</th>';
    for (i = 0; i < days.length; i++) head += "<th>" + Number(days[i].slice(8)) + "</th>";
    head += "</tr>";
    var body = "";
    var totals = [];
    for (i = 0; i < days.length; i++) totals[i] = 0;
    for (var p = 0; p < ids.length; p++) {
      var person = Unit.findPerson(state, ids[p]);
      body += '<tr><td class="name">' + (person ? person.name : ids[p]) + "</td>";
      for (i = 0; i < days.length; i++) {
        var on = false;
        var leaves = byPerson[ids[p]];
        for (var k = 0; k < leaves.length; k++) {
          if (DateUtil.inRange(days[i], leaves[k].start, leaves[k].end)) on = true;
        }
        if (on) {
          totals[i]++;
          body += '<td class="mark">■</td>';
        } else {
          body += "<td></td>";
        }
      }
      body += "</tr>";
    }
    var foot = '<tr><td class="name">일자별 휴가자 총원</td>';
    for (i = 0; i < totals.length; i++) foot += "<td>" + totals[i] + "</td>";
    foot += "</tr>";
    document.getElementById("leave-matrix").innerHTML = head + body + foot;
  }

  function render() {
    var state = AppStore.load();
    document.getElementById("leave-month-label").textContent = DateUtil.monthLabel(monthKey);
    document.getElementById("leave-cap").textContent = "하루 정원 " + Unit.dailyLeaveCap(state) + "명 (전 인원 " + state.personnel.length + "명의 10%)";
    fillPeople();
    document.getElementById("leave-req-body").innerHTML = requestRows(state);
    matrix(state);
  }

  function init() {
    var typeEl = document.getElementById("leave-type");
    typeEl.innerHTML = Unit.leaveTypes.map(function (t) { return '<option value="' + t + '">' + t + "</option>"; }).join("");
    DatePicker.bindField(document.getElementById("leave-range"), { mode: "range", title: "휴가 기간" });
    document.getElementById("leave-prev").onclick = function () { setMonth(DateUtil.addMonths(monthKey, -1)); };
    document.getElementById("leave-next").onclick = function () { setMonth(DateUtil.addMonths(monthKey, 1)); };
    document.getElementById("leave-form").addEventListener("submit", function (e) {
      e.preventDefault();
      addRequest();
    });
    document.getElementById("leave-close").onclick = compileMonth;
    document.getElementById("leave-req-body").addEventListener("click", function (e) {
      var id = e.target.getAttribute("data-del-req");
      if (!id) return;
      AppStore.update(function (state) {
        state.leaveRequests = state.leaveRequests.filter(function (r) { return r.id !== id; });
      });
    });
    AppEvents.on("data", render);
    render();
  }

  return { init: init, render: render, promoteHolds: promoteHolds };
})();
