var DateUtil = {
  pad: function (n) {
    return n < 10 ? "0" + n : String(n);
  },

  fromYmd: function (ymd) {
    var p = String(ymd).split("-");
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  },

  ymd: function (date) {
    return date.getFullYear() + "-" + DateUtil.pad(date.getMonth() + 1) + "-" + DateUtil.pad(date.getDate());
  },

  today: function () {
    return DateUtil.ymd(new Date());
  },

  monthKey: function (dateOrYmd) {
    if (typeof dateOrYmd === "string") return dateOrYmd.slice(0, 7);
    return dateOrYmd.getFullYear() + "-" + DateUtil.pad(dateOrYmd.getMonth() + 1);
  },

  monthLabel: function (monthKey) {
    var p = monthKey.split("-");
    return p[0] + "년 " + Number(p[1]) + "월";
  },

  addMonths: function (monthKey, delta) {
    var p = monthKey.split("-");
    var d = new Date(Number(p[0]), Number(p[1]) - 1 + delta, 1);
    return DateUtil.monthKey(d);
  },

  addDays: function (ymd, delta) {
    var d = DateUtil.fromYmd(ymd);
    d.setDate(d.getDate() + delta);
    return DateUtil.ymd(d);
  },

  prevDay: function (ymd) {
    return DateUtil.addDays(ymd, -1);
  },

  daysInMonth: function (monthKey) {
    var p = monthKey.split("-");
    return new Date(Number(p[0]), Number(p[1]), 0).getDate();
  },

  daysOfMonth: function (monthKey) {
    var n = DateUtil.daysInMonth(monthKey);
    var out = [];
    for (var i = 1; i <= n; i++) out.push(monthKey + "-" + DateUtil.pad(i));
    return out;
  },

  weekday: function (ymd) {
    return DateUtil.fromYmd(ymd).getDay();
  },

  isWeekend: function (ymd) {
    var w = DateUtil.weekday(ymd);
    return w === 0 || w === 6;
  },

  compare: function (a, b) {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  },

  inRange: function (ymd, start, end) {
    if (!start || !end) return false;
    return ymd >= start && ymd <= end;
  },

  eachDay: function (start, end) {
    var out = [];
    if (!start || !end || start > end) return out;
    var cur = start;
    while (cur <= end) {
      out.push(cur);
      cur = DateUtil.addDays(cur, 1);
    }
    return out;
  },

  rangesOverlap: function (a1, a2, b1, b2) {
    return a1 <= b2 && b1 <= a2;
  }
};

var AppEvents = {
  listeners: {},
  on: function (name, fn) {
    if (!AppEvents.listeners[name]) AppEvents.listeners[name] = [];
    AppEvents.listeners[name].push(fn);
  },
  emit: function (name, payload) {
    var list = AppEvents.listeners[name] || [];
    for (var i = 0; i < list.length; i++) list[i](payload);
  }
};

var AppStore = (function () {
  var KEY = "unit-admin-v1";

  function emptyState() {
    return {
      personnel: [],
      dutyBlocks: [],
      duties: { cook: {}, cctv: {}, night: {} },
      dispatchRotation: { baseMonth: "", basePlatoon: 1, overrides: {} },
      dispatches: {},
      leaveRequests: [],
      leaveLists: {},
      blunders: []
    };
  }

  function mergeState(raw) {
    var base = emptyState();
    if (!raw || typeof raw !== "object") return base;
    base.personnel = raw.personnel || [];
    base.dutyBlocks = raw.dutyBlocks || [];
    base.duties = {
      cook: (raw.duties && raw.duties.cook) || {},
      cctv: (raw.duties && raw.duties.cctv) || {},
      night: (raw.duties && raw.duties.night) || {}
    };
    base.dispatchRotation = raw.dispatchRotation || base.dispatchRotation;
    if (!base.dispatchRotation.overrides) base.dispatchRotation.overrides = {};
    base.dispatches = raw.dispatches || {};
    base.leaveRequests = raw.leaveRequests || [];
    base.leaveLists = raw.leaveLists || {};
    base.blunders = raw.blunders || [];
    return base;
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return emptyState();
      return mergeState(JSON.parse(raw));
    } catch (e) {
      return emptyState();
    }
  }

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      AppEvents.emit("data", state);
      return true;
    } catch (e) {
      alert("저장 공간이 부족합니다. 일부 데이터를 지운 뒤 다시 시도하세요.");
      return false;
    }
  }

  function uid(prefix) {
    return (prefix || "id") + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  function update(mutator) {
    var state = load();
    mutator(state);
    save(state);
    return state;
  }

  return {
    KEY: KEY,
    emptyState: emptyState,
    mergeState: mergeState,
    load: load,
    save: save,
    update: update,
    uid: uid
  };
})();

var Unit = {
  ranks: ["이병", "일병", "상병", "병장", "하사", "중사", "상사", "원사", "준위", "소위", "중위", "대위", "소령", "중령", "대령"],
  soldierRanks: ["이병", "일병", "상병", "병장"],
  specialties: ["운전", "통신", "기타"],
  platoons: [1, 2, 3],
  leaveTypes: ["신병위로", "포상", "위로", "특별", "연가", "말출"],

  isOfficer: function (rank) {
    return Unit.soldierRanks.indexOf(rank) === -1;
  },

  title: function (person) {
    if (!person) return "(삭제된 인원)";
    return person.rank + " " + person.name;
  },

  findPerson: function (state, id) {
    for (var i = 0; i < state.personnel.length; i++) {
      if (state.personnel[i].id === id) return state.personnel[i];
    }
    return null;
  },

  dailyLeaveCap: function (state) {
    return Math.floor(state.personnel.length * 0.1);
  },

  recruitEnd: function (person) {
    var start = person.transferDate || person.enlistDate;
    if (!start) return "";
    return DateUtil.addDays(start, 13);
  },

  isRecruitProtected: function (person, ymd) {
    var start = person.transferDate || person.enlistDate;
    if (!start) return false;
    return DateUtil.inRange(ymd, start, DateUtil.addDays(start, 13));
  },

  confirmedLeaves: function (state) {
    var out = [];
    var i;
    for (i = 0; i < state.leaveRequests.length; i++) {
      if (state.leaveRequests[i].status === "confirmed") out.push(state.leaveRequests[i]);
    }
    var months = Object.keys(state.leaveLists);
    for (i = 0; i < months.length; i++) {
      var list = state.leaveLists[months[i]] || [];
      for (var j = 0; j < list.length; j++) out.push(list[j]);
    }
    return out;
  },

  isOnLeave: function (state, personId, ymd) {
    var leaves = Unit.confirmedLeaves(state);
    for (var i = 0; i < leaves.length; i++) {
      var lv = leaves[i];
      if (lv.personId === personId && DateUtil.inRange(ymd, lv.start, lv.end)) return lv;
    }
    return null;
  },

  isMalchul: function (state, personId, ymd) {
    var lv = Unit.isOnLeave(state, personId, ymd);
    return !!(lv && lv.type === "말출");
  },

  dutyWeight: function (state, person, ymd) {
    if (Unit.isOfficer(person.rank)) return 0;
    if (Unit.isRecruitProtected(person, ymd)) return 0;
    if (Unit.isMalchul(state, person.id, ymd)) return 0;
    if (person.rank === "이병") return 20;
    if (person.rank === "일병") return 40;
    if (person.rank === "상병") return 40;
    if (person.rank === "병장") return 20;
    return 0;
  },

  isBlocked: function (state, personId, ymd) {
    for (var i = 0; i < state.dutyBlocks.length; i++) {
      var b = state.dutyBlocks[i];
      if (b.personId === personId && DateUtil.inRange(ymd, b.start, b.end)) return b;
    }
    return null;
  },

  hasOtherDuty: function (state, personId, ymd, exceptType) {
    var types = ["cook", "cctv", "night"];
    for (var t = 0; t < types.length; t++) {
      var type = types[t];
      if (type === exceptType) continue;
      var monthMap = state.duties[type] || {};
      var month = monthMap[DateUtil.monthKey(ymd)];
      if (!month) continue;
      var ids = month[ymd] || [];
      if (ids.indexOf(personId) !== -1) return type;
    }
    return null;
  },

  nextMonth: function (monthKey) {
    return DateUtil.addMonths(monthKey, 1);
  },

  prevMonth: function (monthKey) {
    return DateUtil.addMonths(monthKey, -1);
  },

  dispatchPeriod: function (departMonth) {
    return {
      start: departMonth + "-14",
      end: DateUtil.addMonths(departMonth, 1) + "-14"
    };
  },

  platoonOf: function (state, monthKey) {
    var rot = state.dispatchRotation || {};
    if (rot.overrides && rot.overrides[monthKey]) return Number(rot.overrides[monthKey]);
    if (!rot.baseMonth) return 1;
    var a = rot.baseMonth.split("-");
    var b = monthKey.split("-");
    var months = (Number(b[0]) - Number(a[0])) * 12 + (Number(b[1]) - Number(a[1]));
    return ((Number(rot.basePlatoon || 1) - 1 + months) % 3 + 3) % 3 + 1;
  },

  applyMemberChanges: function (departMonth, member, changes) {
    var period = Unit.dispatchPeriod(departMonth);
    var segments = [{ personId: member.personId, role: member.role, start: period.start, end: period.end }];
    var list = changes || [];
    for (var i = 0; i < list.length; i++) {
      var ch = list[i];
      var next = [];
      for (var s = 0; s < segments.length; s++) {
        var seg = segments[s];
        if (seg.personId !== ch.personId) {
          next.push(seg);
          continue;
        }
        if (ch.type === "early" && ch.date) {
          var earlyEnd = DateUtil.prevDay(ch.date);
          if (earlyEnd >= seg.start) next.push({ personId: seg.personId, role: seg.role, start: seg.start, end: earlyEnd < seg.end ? earlyEnd : seg.end });
        } else if (ch.type === "extend" && ch.date) {
          next.push({ personId: seg.personId, role: seg.role, start: seg.start, end: ch.date > seg.end ? ch.date : seg.end });
        } else if (ch.type === "replace" && ch.date && ch.newPersonId) {
          var cut = DateUtil.prevDay(ch.date);
          if (cut >= seg.start) next.push({ personId: seg.personId, role: seg.role, start: seg.start, end: cut < seg.end ? cut : seg.end });
          if (ch.date <= seg.end) next.push({ personId: ch.newPersonId, role: seg.role, start: ch.date > seg.start ? ch.date : seg.start, end: seg.end });
        } else {
          next.push(seg);
        }
      }
      segments = next;
    }
    return segments;
  },

  allDispatchSegments: function (state) {
    var out = [];
    var keys = Object.keys(state.dispatches);
    for (var i = 0; i < keys.length; i++) {
      var monthKey = keys[i];
      var rec = state.dispatches[monthKey];
      var members = rec.members || [];
      for (var m = 0; m < members.length; m++) {
        var segs = Unit.applyMemberChanges(monthKey, members[m], rec.changes);
        for (var s = 0; s < segs.length; s++) {
          segs[s].departMonth = monthKey;
          out.push(segs[s]);
        }
      }
    }
    return out;
  },

  isOnDispatch: function (state, personId, ymd) {
    var segs = Unit.allDispatchSegments(state);
    for (var i = 0; i < segs.length; i++) {
      if (segs[i].personId === personId && DateUtil.inRange(ymd, segs[i].start, segs[i].end)) return segs[i];
    }
    return null;
  },

  dispatchCount: function (state, personId) {
    var n = 0;
    var keys = Object.keys(state.dispatches);
    for (var i = 0; i < keys.length; i++) {
      var rec = state.dispatches[keys[i]];
      var seen = false;
      var members = rec.members || [];
      for (var m = 0; m < members.length; m++) {
        if (members[m].personId === personId) seen = true;
      }
      var changes = rec.changes || [];
      for (var c = 0; c < changes.length; c++) {
        if (changes[c].newPersonId === personId) seen = true;
      }
      if (seen) n++;
    }
    return n;
  },

  leaveCountOnDay: function (state, ymd, extra) {
    var leaves = Unit.confirmedLeaves(state);
    if (extra) leaves = leaves.concat([extra]);
    var ids = {};
    for (var i = 0; i < leaves.length; i++) {
      var lv = leaves[i];
      if (DateUtil.inRange(ymd, lv.start, lv.end)) ids[lv.personId] = true;
    }
    return Object.keys(ids).length;
  }
};
