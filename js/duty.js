var DutyPage = (function () {
  var monthKey = DateUtil.monthKey(new Date());

  function isEligible(state, person, ymd) {
    if (Unit.isOfficer(person.rank)) return false;
    if (Unit.isRecruitProtected(person, ymd)) return false;
    if (Unit.isOnLeave(state, person.id, ymd)) return false;
    if (Unit.isOnDispatch(state, person.id, ymd)) return false;
    if (Unit.isBlocked(state, person.id, ymd)) return false;
    if (Unit.hasOtherDuty(state, person.id, ymd, "cook")) return false;
    return Unit.dutyWeight(state, person, ymd) > 0;
  }

  function pairKey(a, b) {
    return a < b ? a + "|" + b : b + "|" + a;
  }

  function generate() {
    var state = AppStore.load();
    if (state.duties.cook[monthKey] && !confirm("이미 있는 취사지원 표를 덮어쓸까요?")) return;
    var days = DateUtil.daysOfMonth(monthKey);
    var people = state.personnel;
    var weekdayScore = {};
    var weekendScore = {};
    var weekdayDays = {};
    var weekendDays = {};
    var i, p, d;
    for (i = 0; i < people.length; i++) {
      weekdayScore[people[i].id] = 0;
      weekendScore[people[i].id] = 0;
      weekdayDays[people[i].id] = [];
      weekendDays[people[i].id] = [];
    }
    for (d = 0; d < days.length; d++) {
      var day = days[d];
      var weekend = DateUtil.isWeekend(day);
      for (i = 0; i < people.length; i++) {
        p = people[i];
        if (!isEligible(state, p, day)) continue;
        var w = Unit.dutyWeight(state, p, day);
        if (weekend) {
          weekendScore[p.id] += w;
          weekendDays[p.id].push(day);
        } else {
          weekdayScore[p.id] += w;
          weekdayDays[p.id].push(day);
        }
      }
    }
    function targets(scores, slotDays) {
      var sum = 0;
      var id;
      for (id in scores) sum += scores[id];
      var out = {};
      for (id in scores) out[id] = sum ? (scores[id] / sum) * slotDays * 3 : 0;
      return out;
    }
    var weekdays = days.filter(function (x) { return !DateUtil.isWeekend(x); }).length;
    var weekends = days.length - weekdays;
    var weekdayTarget = targets(weekdayScore, weekdays);
    var weekendTarget = targets(weekendScore, weekends);
    var weekdayCount = {};
    var weekendCount = {};
    var pairCount = {};
    for (i = 0; i < people.length; i++) {
      weekdayCount[people[i].id] = 0;
      weekendCount[people[i].id] = 0;
    }

    var pastMonths = Object.keys(state.duties.cook);
    for (i = 0; i < pastMonths.length; i++) {
      if (pastMonths[i] === monthKey) continue;
      var plan = state.duties.cook[pastMonths[i]];
      for (var dk in plan) {
        var ids = plan[dk] || [];
        for (var a = 0; a < ids.length; a++) {
          for (var b = a + 1; b < ids.length; b++) {
            var pk = pairKey(ids[a], ids[b]);
            pairCount[pk] = (pairCount[pk] || 0) + 1;
          }
        }
      }
    }

    var assignments = {};
    for (d = 0; d < days.length; d++) {
      day = days[d];
      weekend = DateUtil.isWeekend(day);
      var eligible = [];
      for (i = 0; i < people.length; i++) {
        if (isEligible(state, people[i], day)) eligible.push(people[i]);
      }
      var picked = [];
      function daysFrom(list, ymd) {
        var n = 0;
        for (var t = 0; t < list.length; t++) if (list[t] >= ymd) n++;
        return n;
      }
      function scoreOf(person) {
        var target = weekend ? weekendTarget[person.id] : weekdayTarget[person.id];
        var cur = weekend ? weekendCount[person.id] : weekdayCount[person.id];
        var left = daysFrom(weekend ? weekendDays[person.id] : weekdayDays[person.id], day);
        var urgency = left ? (target - cur) / left : -1;
        var penalty = 0;
        for (var x = 0; x < picked.length; x++) {
          penalty += (pairCount[pairKey(person.id, picked[x])] || 0) * 0.35;
        }
        return urgency + (left ? 0.001 / left : 0) - penalty;
      }
      for (var slot = 0; slot < 3; slot++) {
        var best = null;
        var bestScore = -1e9;
        for (i = 0; i < eligible.length; i++) {
          if (picked.indexOf(eligible[i].id) !== -1) continue;
          var sc = scoreOf(eligible[i]);
          if (sc > bestScore) {
            bestScore = sc;
            best = eligible[i];
          }
        }
        if (!best) break;
        picked.push(best.id);
      }
      assignments[day] = picked;
      for (i = 0; i < picked.length; i++) {
        if (weekend) weekendCount[picked[i]]++;
        else weekdayCount[picked[i]]++;
        for (var j = i + 1; j < picked.length; j++) {
          var k = pairKey(picked[i], picked[j]);
          pairCount[k] = (pairCount[k] || 0) + 1;
        }
      }
    }

    AppStore.update(function (s) {
      s.duties.cook[monthKey] = assignments;
    });
  }

  function counts() {
    var state = AppStore.load();
    var plan = (state.duties.cook[monthKey] || {});
    var map = {};
    for (var i = 0; i < state.personnel.length; i++) {
      map[state.personnel[i].id] = { weekday: 0, weekend: 0, person: state.personnel[i] };
    }
    var days = Object.keys(plan);
    for (i = 0; i < days.length; i++) {
      var ymd = days[i];
      var ids = plan[ymd] || [];
      for (var j = 0; j < ids.length; j++) {
        if (!map[ids[j]]) continue;
        if (DateUtil.isWeekend(ymd)) map[ids[j]].weekend++;
        else map[ids[j]].weekday++;
      }
    }
    return map;
  }

  function heatColor(value, max) {
    if (!max) return "rgba(63,90,45,0.08)";
    var t = value / max;
    return "rgba(63,90,45," + (0.08 + t * 0.72).toFixed(2) + ")";
  }

  function pctLabel(count, total) {
    if (!total) return "0%";
    return Math.round((count / total) * 1000) / 10 + "%";
  }

  function heatCell(count, total, max) {
    return (
      '<div class="heat-cell" style="background:' + heatColor(count, max) + '">' +
      "<strong>" + count + "</strong><small>" + pctLabel(count, total) + "</small></div>"
    );
  }

  function showHeatmap() {
    var map = counts();
    var ranks = ["병장", "상병", "일병", "이병"];
    var weightLabel = { 병장: "20%", 상병: "40%", 일병: "40%", 이병: "20%" };
    var groups = {};
    var max = 0;
    var weekdayTotal = 0;
    var weekendTotal = 0;
    var i;
    var ids = Object.keys(map);
    for (i = 0; i < ranks.length; i++) groups[ranks[i]] = [];
    for (i = 0; i < ids.length; i++) {
      var row = map[ids[i]];
      if (!groups[row.person.rank]) continue;
      groups[row.person.rank].push(row);
      max = Math.max(max, row.weekday, row.weekend);
      weekdayTotal += row.weekday;
      weekendTotal += row.weekend;
    }
    var html = "";
    for (i = 0; i < ranks.length; i++) {
      var rank = ranks[i];
      var list = groups[rank].sort(function (a, b) {
        return (b.weekday + b.weekend) - (a.weekday + a.weekend);
      });
      if (!list.length) continue;
      var rw = 0;
      var re = 0;
      for (var j = 0; j < list.length; j++) {
        rw += list[j].weekday;
        re += list[j].weekend;
      }
      html +=
        '<div class="heat-rank">' + rank + " · 배정 비중 " + weightLabel[rank] +
        " · 평일 " + rw + "회(" + pctLabel(rw, weekdayTotal) + ") · 주말 " + re + "회(" + pctLabel(re, weekendTotal) + ")</div>";
      for (j = 0; j < list.length; j++) {
        html +=
          '<div class="heatmap"><span>' + list[j].person.name + "</span>" +
          heatCell(list[j].weekday, weekdayTotal, max) +
          heatCell(list[j].weekend, weekendTotal, max) + "</div>";
      }
    }
    document.getElementById("heatmap-body").innerHTML = html || '<p class="muted">편성 자료가 없습니다.</p>';
    document.getElementById("heatmap-overlay").classList.add("open");
  }

  function fillBlockPeople() {
    var state = AppStore.load();
    var html = "";
    for (var i = 0; i < state.personnel.length; i++) {
      html += '<option value="' + state.personnel[i].id + '">' + Unit.title(state.personnel[i]) + "</option>";
    }
    document.getElementById("block-person").innerHTML = html;
  }

  function renderBlocks(state) {
    var html = "";
    for (var i = 0; i < state.dutyBlocks.length; i++) {
      var b = state.dutyBlocks[i];
      html +=
        "<tr><td>" + Unit.title(Unit.findPerson(state, b.personId)) + "</td><td>" + b.start + " ~ " + b.end +
        "</td><td>" + (b.reason || "") + '</td><td><button type="button" class="btn danger" data-del-block="' + b.id + '">삭제</button></td></tr>';
    }
    document.getElementById("block-body").innerHTML = html || '<tr><td colspan="4" class="muted">막은 기간이 없습니다.</td></tr>';
  }

  function renderCalendar(state) {
    var plan = state.duties.cook[monthKey] || {};
    var days = DateUtil.daysOfMonth(monthKey);
    var first = DateUtil.weekday(days[0]);
    var html = "";
    var i;
    for (i = 0; i < first; i++) html += '<div class="cal-cell out"></div>';
    var shortDays = 0;
    for (i = 0; i < days.length; i++) {
      var ymd = days[i];
      var names = (plan[ymd] || []).map(function (id) { return Unit.title(Unit.findPerson(state, id)); });
      var short = plan[ymd] && plan[ymd].length < 3;
      if (short) shortDays++;
      html +=
        '<div class="cal-cell' + (DateUtil.isWeekend(ymd) ? " weekend" : "") + (short ? " short" : "") + '">' +
        '<div class="d">' + Number(ymd.slice(8)) + (DateUtil.isWeekend(ymd) ? ' <span class="badge weekend">주말</span>' : "") + "</div>" +
        "<ul>" + (names.length ? names.map(function (n) { return "<li>" + n + "</li>"; }).join("") : '<li class="muted">미편성</li>') + "</ul></div>";
    }
    document.getElementById("duty-calendar").innerHTML = html;
    document.getElementById("duty-month-label").textContent = DateUtil.monthLabel(monthKey);
    document.getElementById("duty-summary").textContent = shortDays
      ? "후보가 부족한 날 " + shortDays + "일. 빈칸은 그대로 두었습니다."
      : (Object.keys(plan).length ? "하루 3명, 평일과 주말 횟수를 따로 맞췄습니다." : "아직 이 달 편성이 없습니다.");
  }

  function render() {
    var state = AppStore.load();
    fillBlockPeople();
    renderBlocks(state);
    renderCalendar(state);
  }

  function init() {
    DatePicker.bindField(document.getElementById("block-range"), { mode: "range", title: "막는 기간" });
    document.getElementById("duty-prev").onclick = function () { monthKey = DateUtil.addMonths(monthKey, -1); render(); };
    document.getElementById("duty-next").onclick = function () { monthKey = DateUtil.addMonths(monthKey, 1); render(); };
    document.getElementById("duty-generate").onclick = generate;
    document.getElementById("duty-heatmap").onclick = showHeatmap;
    document.getElementById("heatmap-close").onclick = function () {
      document.getElementById("heatmap-overlay").classList.remove("open");
    };
    document.getElementById("heatmap-overlay").addEventListener("click", function (e) {
      if (e.target.id === "heatmap-overlay") e.currentTarget.classList.remove("open");
    });
    document.getElementById("block-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var personId = document.getElementById("block-person").value;
      var range = DatePicker.read(document.getElementById("block-range"));
      if (!personId || !range.start) {
        alert("인원과 기간을 고르세요.");
        return;
      }
      AppStore.update(function (s) {
        s.dutyBlocks.push({
          id: AppStore.uid("bk"),
          personId: personId,
          start: range.start,
          end: range.end,
          reason: document.getElementById("block-reason").value.trim()
        });
      });
      DatePicker.write(document.getElementById("block-range"), "", "", true);
      document.getElementById("block-reason").value = "";
    });
    document.getElementById("block-body").addEventListener("click", function (e) {
      var id = e.target.getAttribute("data-del-block");
      if (!id) return;
      AppStore.update(function (s) {
        s.dutyBlocks = s.dutyBlocks.filter(function (b) { return b.id !== id; });
      });
    });
    AppEvents.on("data", render);
    render();
  }

  return { init: init, render: render };
})();
