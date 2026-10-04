var SampleData = (function () {
  function p(id, serial, rank, name, specialty, platoon, enlist, discharge, transfer, note) {
    return {
      id: id,
      serial: serial,
      rank: rank,
      name: name,
      specialty: specialty,
      platoon: platoon,
      enlistDate: enlist,
      dischargeDate: discharge,
      transferDate: transfer,
      note: note || ""
    };
  }

  function build() {
    var personnel = [
      p("p01", "21-12345678", "병장", "김철수", "운전", 1, "2024-04-15", "2026-01-14", "2024-10-20"),
      p("p02", "22-23456781", "상병", "이준호", "통신", 1, "2024-10-14", "2026-07-13", "2025-04-20"),
      p("p03", "22-34567812", "상병", "박민수", "통신", 1, "2024-11-11", "2026-08-10", "2025-05-18"),
      p("p04", "23-45678123", "일병", "최태양", "통신", 1, "2025-04-14", "2027-01-13", "2025-10-19"),
      p("p05", "23-56781234", "일병", "정우성", "기타", 1, "2025-05-12", "2027-02-11", "2025-11-16"),
      p("p06", "24-67812345", "이병", "한도윤", "기타", 1, "2026-08-18", "2028-05-17", "2026-09-28", "신병"),
      p("p07", "22-78123456", "상병", "오세훈", "기타", 1, "2024-12-09", "2026-09-08", "2025-06-15"),
      p("p08", "21-81234567", "병장", "윤재혁", "기타", 1, "2024-05-13", "2026-02-12", "2024-11-17"),
      p("p09", "23-19876543", "일병", "서강준", "기타", 1, "2025-06-16", "2027-03-15", "2025-12-21"),
      p("p10", "19-11112222", "하사", "강민호", "기타", 1, "2019-03-01", "2027-03-01", "2023-01-10", "1소대장"),

      p("p11", "21-22223333", "병장", "조현우", "운전", 2, "2024-03-18", "2025-12-17", "2024-09-22"),
      p("p12", "22-33334444", "상병", "임재민", "통신", 2, "2024-09-16", "2026-06-15", "2025-03-23"),
      p("p13", "23-44445555", "일병", "배성훈", "통신", 2, "2025-03-17", "2026-12-16", "2025-09-21"),
      p("p14", "22-55556666", "상병", "노지훈", "통신", 2, "2024-10-21", "2026-07-20", "2025-04-27"),
      p("p15", "21-66667777", "병장", "문태영", "기타", 2, "2024-06-10", "2026-03-09", "2024-12-15"),
      p("p16", "23-77778888", "일병", "신동엽", "기타", 2, "2025-07-14", "2027-04-13", "2026-01-18"),
      p("p17", "24-88889999", "이병", "유시온", "기타", 2, "2026-07-21", "2028-04-20", "2026-09-22", "신병"),
      p("p18", "22-99990000", "상병", "하준서", "기타", 2, "2025-01-13", "2026-10-12", "2025-07-20"),
      p("p19", "18-10101010", "중사", "이병헌", "기타", 2, "2018-06-01", "2028-06-01", "2022-05-10", "2소대장"),
      p("p20", "23-12121212", "일병", "권지용", "기타", 2, "2025-08-11", "2027-05-10", "2026-02-16"),

      p("p21", "22-13131313", "상병", "장민재", "운전", 3, "2024-08-19", "2026-05-18", "2025-02-23"),
      p("p22", "21-14141414", "병장", "황선우", "통신", 3, "2024-04-22", "2026-01-21", "2024-10-27"),
      p("p23", "23-15151515", "일병", "백승호", "통신", 3, "2025-04-21", "2027-01-20", "2025-10-26"),
      p("p24", "22-16161616", "상병", "안재욱", "통신", 3, "2024-11-18", "2026-08-17", "2025-05-25"),
      p("p25", "23-17171717", "일병", "홍길동", "기타", 3, "2025-06-23", "2027-03-22", "2025-12-28"),
      p("p26", "24-18181818", "이병", "송민호", "기타", 3, "2026-08-25", "2028-05-24", "2026-09-29", "신병"),
      p("p27", "22-19191919", "상병", "고경표", "기타", 3, "2025-02-17", "2026-11-16", "2025-08-24"),
      p("p28", "21-20202020", "병장", "남주혁", "기타", 3, "2024-07-15", "2026-04-14", "2025-01-19"),
      p("p29", "16-21212121", "대위", "김중대", "기타", 1, "2016-03-01", "2028-03-01", "2024-12-01", "중대장"),
      p("p30", "23-23232323", "일병", "차은우", "기타", 3, "2025-09-08", "2027-06-07", "2026-03-15")
    ];

    return {
      personnel: personnel,
      dutyBlocks: [
        { id: "bk1", personId: "p05", start: "2026-10-20", end: "2026-10-22", reason: "대대 지원" }
      ],
      duties: { cook: {}, cctv: {}, night: {} },
      dispatchRotation: { baseMonth: "2026-09", basePlatoon: 3, overrides: {} },
      dispatches: {
        "2026-09": {
          platoon: 3,
          members: [
            { personId: "p21", role: "driver" },
            { personId: "p22", role: "signal" },
            { personId: "p23", role: "signal" },
            { personId: "p24", role: "signal" }
          ],
          changes: []
        },
        "2026-10": {
          platoon: 1,
          members: [
            { personId: "p01", role: "driver" },
            { personId: "p02", role: "signal" },
            { personId: "p03", role: "signal" },
            { personId: "p04", role: "signal" }
          ],
          changes: []
        }
      },
      leaveRequests: [
        { id: "lv1", personId: "p08", start: "2026-10-06", end: "2026-10-10", type: "연가", status: "confirmed", createdAt: 1 },
        { id: "lv2", personId: "p11", start: "2026-10-08", end: "2026-10-12", type: "포상", status: "confirmed", createdAt: 2 },
        { id: "lv3", personId: "p15", start: "2026-10-08", end: "2026-10-11", type: "위로", status: "confirmed", createdAt: 3 },
        { id: "lv4", personId: "p18", start: "2026-10-08", end: "2026-10-14", type: "말출", status: "hold", createdAt: 4 },
        { id: "lv5", personId: "p20", start: "2026-11-03", end: "2026-11-07", type: "연가", status: "confirmed", createdAt: 5 },
        { id: "lv6", personId: "p25", start: "2026-11-03", end: "2026-11-06", type: "신병위로", status: "confirmed", createdAt: 6 },
        { id: "lv7", personId: "p30", start: "2026-11-03", end: "2026-11-08", type: "포상", status: "confirmed", createdAt: 7 },
        { id: "lv8", personId: "p09", start: "2026-11-03", end: "2026-11-05", type: "위로", status: "hold", createdAt: 8 }
      ],
      leaveLists: {},
      blunders: [
        { id: "bl1", personId: "p25", date: "2026-09-12", text: "연명부 군번을 한 자리 바꿔 적음" }
      ]
    };
  }

  return { build: build };
})();

document.addEventListener("DOMContentLoaded", function () {
  var tabs = document.querySelectorAll(".tab");
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].addEventListener("click", function () {
      var name = this.getAttribute("data-tab");
      for (var j = 0; j < tabs.length; j++) tabs[j].classList.remove("active");
      this.classList.add("active");
      var pages = document.querySelectorAll(".page");
      for (var k = 0; k < pages.length; k++) pages[k].classList.remove("active");
      document.getElementById("page-" + name).classList.add("active");
    });
  }

  document.getElementById("btn-export").onclick = function () {
    var text = JSON.stringify(AppStore.load(), null, 2);
    var blob = new Blob([text], { type: "application/json" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "중대행정-" + DateUtil.today() + ".json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  document.getElementById("btn-import").onclick = function () {
    document.getElementById("btn-import-file").click();
  };

  document.getElementById("btn-import-file").addEventListener("change", function () {
    var file = this.files && this.files[0];
    this.value = "";
    if (!file) return;
    var reader = new FileReader();
    reader.onerror = function () {
      alert("파일을 읽지 못했습니다.");
    };
    reader.onload = function () {
      var parsed;
      try {
        parsed = JSON.parse(String(reader.result || ""));
      } catch (e) {
        alert("JSON 형식이 아닙니다.");
        return;
      }
      if (AppStore.load().personnel.length && !confirm("지금 데이터를 이 파일 내용으로 바꿀까요?")) return;
      if (Array.isArray(parsed)) {
        var next = AppStore.load();
        next.personnel = parsed;
        AppStore.save(AppStore.mergeState(next));
      } else if (parsed && typeof parsed === "object") {
        AppStore.save(AppStore.mergeState(parsed));
      } else {
        alert("연명부 또는 전체 저장 형식의 JSON이어야 합니다.");
      }
    };
    reader.readAsText(file, "UTF-8");
  });

  document.getElementById("btn-sample").onclick = function () {
    if (AppStore.load().personnel.length && !confirm("지금 데이터를 예시 데이터로 바꿀까요?")) return;
    AppStore.save(SampleData.build());
  };
  document.getElementById("btn-reset").onclick = function () {
    if (!confirm("연명부, 근무, 파견, 휴가, 찐빠 목록을 모두 지울까요?")) return;
    AppStore.save(AppStore.emptyState());
  };

  RosterPage.init();
  LeavePage.init();
  DispatchPage.init();
  DutyPage.init();
  EggPage.init();
});
