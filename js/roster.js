var RosterPage = (function () {
  function fillSelect(el, items, withEmpty) {
    var html = withEmpty ? '<option value="">전체</option>' : "";
    for (var i = 0; i < items.length; i++) {
      var v = items[i];
      html += '<option value="' + v + '">' + v + (typeof v === "number" ? "소대" : "") + "</option>";
    }
    el.innerHTML = html;
  }

  function resetForm() {
    document.getElementById("roster-id").value = "";
    document.getElementById("roster-form").reset();
    document.getElementById("roster-form-title").textContent = "인원 추가";
    document.getElementById("roster-submit").textContent = "추가";
    DatePicker.write(document.getElementById("roster-enlist"), "", "", false);
    DatePicker.write(document.getElementById("roster-discharge"), "", "", false);
    DatePicker.write(document.getElementById("roster-transfer"), "", "", false);
  }

  function readForm() {
    return {
      id: document.getElementById("roster-id").value || AppStore.uid("p"),
      serial: document.getElementById("roster-serial").value.trim(),
      rank: document.getElementById("roster-rank").value,
      name: document.getElementById("roster-name").value.trim(),
      specialty: document.getElementById("roster-spec").value,
      platoon: Number(document.getElementById("roster-platoon").value),
      enlistDate: DatePicker.read(document.getElementById("roster-enlist")).start,
      dischargeDate: DatePicker.read(document.getElementById("roster-discharge")).start,
      transferDate: DatePicker.read(document.getElementById("roster-transfer")).start,
      note: document.getElementById("roster-note").value.trim()
    };
  }

  function edit(person) {
    document.getElementById("roster-id").value = person.id;
    document.getElementById("roster-serial").value = person.serial;
    document.getElementById("roster-rank").value = person.rank;
    document.getElementById("roster-name").value = person.name;
    document.getElementById("roster-spec").value = person.specialty;
    document.getElementById("roster-platoon").value = String(person.platoon);
    document.getElementById("roster-note").value = person.note || "";
    DatePicker.write(document.getElementById("roster-enlist"), person.enlistDate, person.enlistDate, false);
    DatePicker.write(document.getElementById("roster-discharge"), person.dischargeDate, person.dischargeDate, false);
    DatePicker.write(document.getElementById("roster-transfer"), person.transferDate, person.transferDate, false);
    document.getElementById("roster-form-title").textContent = "인원 수정";
    document.getElementById("roster-submit").textContent = "저장";
    window.scrollTo(0, 0);
  }

  function render() {
    var state = AppStore.load();
    var platoon = document.getElementById("filter-platoon").value;
    var spec = document.getElementById("filter-spec").value;
    var rows = "";
    var list = state.personnel.slice().sort(function (a, b) {
      if (a.platoon !== b.platoon) return a.platoon - b.platoon;
      return a.name.localeCompare(b.name, "ko");
    });
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      if (platoon && String(p.platoon) !== platoon) continue;
      if (spec && p.specialty !== spec) continue;
      rows +=
        "<tr>" +
        "<td>" + p.serial + "</td>" +
        "<td>" + p.rank + "</td>" +
        "<td>" + p.name + "</td>" +
        "<td>" + p.specialty + "</td>" +
        "<td>" + p.platoon + "소대</td>" +
        "<td>" + (p.enlistDate || "") + "</td>" +
        "<td>" + (p.dischargeDate || "") + "</td>" +
        "<td>" + (p.transferDate || "") + "</td>" +
        "<td>" + (p.note || "") + "</td>" +
        '<td><button type="button" class="btn" data-edit="' + p.id + '">수정</button> ' +
        '<button type="button" class="btn danger" data-del="' + p.id + '">삭제</button></td>' +
        "</tr>";
    }
    document.getElementById("roster-body").innerHTML = rows || '<tr><td colspan="10" class="muted">인원이 없습니다.</td></tr>';
  }

  function init() {
    fillSelect(document.getElementById("roster-rank"), Unit.ranks, false);
    fillSelect(document.getElementById("roster-spec"), Unit.specialties, false);
    fillSelect(document.getElementById("roster-platoon"), Unit.platoons, false);
    fillSelect(document.getElementById("filter-platoon"), Unit.platoons, true);
    fillSelect(document.getElementById("filter-spec"), Unit.specialties, true);

    DatePicker.bindField(document.getElementById("roster-enlist"), { title: "입대일" });
    DatePicker.bindField(document.getElementById("roster-discharge"), { title: "전역예정일" });
    DatePicker.bindField(document.getElementById("roster-transfer"), { title: "전입일" });

    document.getElementById("roster-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var person = readForm();
      if (!person.serial || !person.name) return;
      var isNew = !document.getElementById("roster-id").value;
      AppStore.update(function (state) {
        var idx = -1;
        for (var i = 0; i < state.personnel.length; i++) {
          if (state.personnel[i].id === person.id) idx = i;
        }
        if (idx === -1) state.personnel.push(person);
        else state.personnel[idx] = person;
      });
      if (isNew && typeof LeavePage !== "undefined") LeavePage.promoteHolds();
      resetForm();
    });

    document.getElementById("roster-cancel").addEventListener("click", resetForm);
    document.getElementById("filter-platoon").addEventListener("change", render);
    document.getElementById("filter-spec").addEventListener("change", render);

    document.getElementById("roster-body").addEventListener("click", function (e) {
      var editId = e.target.getAttribute("data-edit");
      var delId = e.target.getAttribute("data-del");
      var state = AppStore.load();
      if (editId) {
        var person = Unit.findPerson(state, editId);
        if (person) edit(person);
      }
      if (delId && confirm("이 인원을 연명부에서 삭제할까요?")) {
        AppStore.update(function (s) {
          s.personnel = s.personnel.filter(function (p) { return p.id !== delId; });
        });
      }
    });

    AppEvents.on("data", render);
    resetForm();
    render();
  }

  return { init: init, render: render };
})();
