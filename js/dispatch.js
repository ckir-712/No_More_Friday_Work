var DispatchPage = (function () {
  var monthKey = DateUtil.monthKey(new Date());

  function ensureRotation(state) {
    if (!state.dispatchRotation.baseMonth) {
      state.dispatchRotation.baseMonth = monthKey;
      state.dispatchRotation.basePlatoon = 1;
    }
  }

  function memberHtml(state, rec, departMonth) {
    if (!rec || !rec.members || !rec.members.length) return '<p class="muted">아직 명단이 없습니다.</p>';
    var html = "";
    for (var i = 0; i < rec.members.length; i++) {
      var m = rec.members[i];
      var person = Unit.findPerson(state, m.personId);
      html +=
        '<div class="candidate"><div><strong>' + Unit.title(person) + "</strong> " +
        '<span class="badge">' + (m.role === "driver" ? "운전" : "통신") + "</span></div></div>";
    }
    return html;
  }

  function fillMonthSelect(el, selected) {
    var html = "";
    var start = DateUtil.addMonths(monthKey, -3);
    for (var i = 0; i < 10; i++) {
      var mk = DateUtil.addMonths(start, i);
      html += '<option value="' + mk + '"' + (mk === selected ? " selected" : "") + ">" + DateUtil.monthLabel(mk) + "</option>";
    }
    el.innerHTML = html;
  }

  function candidates(state, platoon, role, period) {
    var out = [];
    for (var i = 0; i < state.personnel.length; i++) {
      var p = state.personnel[i];
      if (p.platoon !== platoon) continue;
      if (role === "driver" && p.specialty !== "운전") continue;
      if (role === "signal" && p.specialty !== "통신") continue;
      var leaveHit = null;
      var days = DateUtil.eachDay(period.start, period.end);
      for (var d = 0; d < days.length; d++) {
        var lv = Unit.isOnLeave(state, p.id, days[d]);
        if (lv) { leaveHit = lv; break; }
      }
      out.push({ person: p, excluded: !!leaveHit, leave: leaveHit, count: Unit.dispatchCount(state, p.id) });
    }
    return out;
  }

  function candHtml(list, name, max) {
    var html = "";
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      var dis = c.excluded ? " disabled" : "";
      var why = c.excluded ? " · 휴가 " + c.leave.start + " ~ " + c.leave.end : "";
      html +=
        '<label class="candidate"><span><input type="checkbox" name="' + name + '" value="' + c.person.id + '"' + dis + "> " +
        Unit.title(c.person) + why + '</span><span class="badge">파견 ' + c.count + "회</span></label>";
    }
    if (!list.length) html = '<p class="muted">해당 특기 인원이 없습니다.</p>';
    return html;
  }

  function selectedIds(name) {
    var boxes = document.querySelectorAll('input[name="' + name + '"]:checked');
    var ids = [];
    for (var i = 0; i < boxes.length; i++) ids.push(boxes[i].value);
    return ids;
  }

  function fillChangePeople() {
    var state = AppStore.load();
    var mk = document.getElementById("change-month").value;
    var rec = state.dispatches[mk];
    var html = "";
    if (rec) {
      for (var i = 0; i < (rec.members || []).length; i++) {
        var p = Unit.findPerson(state, rec.members[i].personId);
        html += '<option value="' + rec.members[i].personId + '">' + Unit.title(p) + "</option>";
      }
    }
    document.getElementById("change-person").innerHTML = html || '<option value="">명단 없음</option>';
    var all = "";
    for (var j = 0; j < state.personnel.length; j++) {
      all += '<option value="' + state.personnel[j].id + '">' + Unit.title(state.personnel[j]) + "</option>";
    }
    document.getElementById("change-replace").innerHTML = all;
  }

  function saveNext() {
    var mk = document.getElementById("next-month").value;
    var drivers = selectedIds("cand-driver");
    var signals = selectedIds("cand-signal");
    if (drivers.length !== 1 || signals.length !== 3) {
      alert("운전병 1명, 통신병 3명을 고르세요.");
      return;
    }
    var state = AppStore.load();
    var platoon = Unit.platoonOf(state, mk);
    AppStore.update(function (s) {
      ensureRotation(s);
      s.dispatches[mk] = s.dispatches[mk] || { members: [], changes: [] };
      s.dispatches[mk].platoon = platoon;
      s.dispatches[mk].members = [{ personId: drivers[0], role: "driver" }].concat(
        signals.map(function (id) { return { personId: id, role: "signal" }; })
      );
      if (!s.dispatches[mk].changes) s.dispatches[mk].changes = [];
    });
    alert(DateUtil.monthLabel(mk) + " 파견 명단을 저장했습니다.");
  }

  function addChange(e) {
    e.preventDefault();
    var mk = document.getElementById("change-month").value;
    var personId = document.getElementById("change-person").value;
    var type = document.getElementById("change-type").value;
    var date = DatePicker.read(document.getElementById("change-date")).start;
    var newPersonId = document.getElementById("change-replace").value;
    var note = document.getElementById("change-note").value.trim();
    if (!mk || !personId || !date) {
      alert("출발 월, 인원, 적용일을 고르세요.");
      return;
    }
    if (type === "replace" && !newPersonId) {
      alert("대체 인원을 고르세요.");
      return;
    }
    AppStore.update(function (s) {
      if (!s.dispatches[mk]) s.dispatches[mk] = { members: [], changes: [] };
      s.dispatches[mk].changes = s.dispatches[mk].changes || [];
      s.dispatches[mk].changes.push({
        id: AppStore.uid("ch"),
        type: type,
        personId: personId,
        newPersonId: type === "replace" ? newPersonId : "",
        date: date,
        note: note
      });
    });
    var state = AppStore.load();
    if (state.duties.cook[monthKey] || state.duties.cook[mk] || state.duties.cook[DateUtil.addMonths(mk, 1)]) {
      var notice = document.getElementById("change-notice");
      notice.hidden = false;
      notice.textContent = "변동을 반영했습니다. 이미 만든 취사지원 표는 그대로 두었습니다. 필요하면 취사지원에서 다시 편성하세요.";
    }
  }

  function render() {
    var state = AppStore.load();
    if (!state.dispatchRotation.baseMonth) {
      ensureRotation(state);
      AppStore.save(state);
      return;
    }

    document.getElementById("disp-month-label").textContent = DateUtil.monthLabel(monthKey);
    var platoon = Unit.platoonOf(state, monthKey);
    var sel = document.getElementById("disp-platoon");
    sel.innerHTML = '<option value="1">1소대</option><option value="2">2소대</option><option value="3">3소대</option>';
    sel.value = String(platoon);
    document.getElementById("disp-rotate-hint").textContent =
      "기준 " + DateUtil.monthLabel(state.dispatchRotation.baseMonth) + " " +
      state.dispatchRotation.basePlatoon + "소대부터 한 달씩 순환합니다. 14일 출발, 운전 1 · 통신 3.";

    var prev = DateUtil.addMonths(monthKey, -1);
    var ipa = Unit.dispatchPeriod(prev);
    ipa.start = monthKey + "-01";
    ipa.end = monthKey + "-14";
    var haepa = { start: monthKey + "-14", end: DateUtil.addMonths(monthKey, 1) + "-13" };
    document.getElementById("ipa-range").textContent = ipa.start + " ~ " + ipa.end + " · 14일 인수인계";
    document.getElementById("haepa-range").textContent = haepa.start + " ~ " + haepa.end + " · 14일 인수인계";
    document.getElementById("ipa-list").innerHTML = memberHtml(state, state.dispatches[prev], prev);
    document.getElementById("haepa-list").innerHTML = memberHtml(state, state.dispatches[monthKey], monthKey);

    var nextSel = document.getElementById("next-month");
    var keepNext = nextSel.value || DateUtil.addMonths(monthKey, 1);
    fillMonthSelect(nextSel, keepNext);
    var nextMonth = nextSel.value;
    var nextPlatoon = Unit.platoonOf(state, nextMonth);
    document.getElementById("next-platoon-label").textContent = DateUtil.monthLabel(nextMonth) + " 파견 소대: " + nextPlatoon + "소대";
    var period = Unit.dispatchPeriod(nextMonth);
    document.getElementById("cand-driver").innerHTML = candHtml(candidates(state, nextPlatoon, "driver", period), "cand-driver");
    document.getElementById("cand-signal").innerHTML = candHtml(candidates(state, nextPlatoon, "signal", period), "cand-signal");

    var changeMonth = document.getElementById("change-month");
    var keepChange = changeMonth.value || monthKey;
    fillMonthSelect(changeMonth, keepChange);
    fillChangePeople();

    var rec = state.dispatches[changeMonth.value];
    var chHtml = "";
    if (rec && rec.changes) {
      for (var i = 0; i < rec.changes.length; i++) {
        var ch = rec.changes[i];
        var label = ch.type === "extend" ? "연장" : ch.type === "early" ? "조기복귀" : "교체";
        var who = Unit.title(Unit.findPerson(state, ch.personId));
        var extra = ch.newPersonId ? " → " + Unit.title(Unit.findPerson(state, ch.newPersonId)) : "";
        chHtml += '<div class="candidate"><span>' + label + " · " + who + extra + " · " + ch.date + " " + (ch.note || "") +
          '</span><button type="button" class="btn danger" data-del-ch="' + ch.id + '" data-ch-month="' + changeMonth.value + '">삭제</button></div>';
      }
    }
    document.getElementById("change-list").innerHTML = chHtml || '<p class="muted">변동 기록이 없습니다.</p>';
    document.getElementById("change-replace-wrap").style.display = document.getElementById("change-type").value === "replace" ? "block" : "none";
  }

  function init() {
    DatePicker.bindField(document.getElementById("change-date"), { title: "적용일" });
    document.getElementById("disp-prev").onclick = function () { monthKey = DateUtil.addMonths(monthKey, -1); render(); };
    document.getElementById("disp-next").onclick = function () { monthKey = DateUtil.addMonths(monthKey, 1); render(); };
    document.getElementById("disp-save-platoon").onclick = function () {
      AppStore.update(function (s) {
        ensureRotation(s);
        s.dispatchRotation.overrides[monthKey] = Number(document.getElementById("disp-platoon").value);
      });
    };
    document.getElementById("next-month").onchange = render;
    document.getElementById("next-save").onclick = saveNext;
    document.getElementById("change-month").onchange = function () { fillChangePeople(); render(); };
    document.getElementById("change-type").onchange = render;
    document.getElementById("change-form").addEventListener("submit", addChange);
    document.getElementById("change-list").addEventListener("click", function (e) {
      var id = e.target.getAttribute("data-del-ch");
      var mk = e.target.getAttribute("data-ch-month");
      if (!id) return;
      AppStore.update(function (s) {
        if (!s.dispatches[mk]) return;
        s.dispatches[mk].changes = (s.dispatches[mk].changes || []).filter(function (c) { return c.id !== id; });
      });
    });
    AppEvents.on("data", render);
    render();
  }

  return { init: init, render: render };
})();
