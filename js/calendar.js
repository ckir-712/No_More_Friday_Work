var DatePicker = (function () {
  var overlay;
  var monthEl;
  var gridEl;
  var hintEl;
  var titleEl;
  var monthKey;
  var mode = "single";
  var start = "";
  var end = "";
  var onDone = null;

  function ensure() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML =
      '<div class="modal calendar-modal" role="dialog" aria-modal="true">' +
      '<div class="modal-head"><h3 id="cal-title">날짜 선택</h3><button type="button" class="icon-btn" data-cal="close">닫기</button></div>' +
      '<div class="cal-nav"><button type="button" data-cal="prev">이전달</button><strong id="cal-month"></strong><button type="button" data-cal="next">다음달</button></div>' +
      '<div class="cal-weekdays"><span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span></div>' +
      '<div class="cal-grid" id="cal-grid"></div>' +
      '<p class="cal-hint" id="cal-hint"></p>' +
      '<div class="modal-actions"><button type="button" class="btn" data-cal="clear">지우기</button><button type="button" class="btn primary" data-cal="ok">확인</button></div>' +
      "</div>";
    document.body.appendChild(overlay);
    titleEl = overlay.querySelector("#cal-title");
    monthEl = overlay.querySelector("#cal-month");
    gridEl = overlay.querySelector("#cal-grid");
    hintEl = overlay.querySelector("#cal-hint");
    overlay.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-cal]");
      if (e.target === overlay) close();
      if (!btn) return;
      var act = btn.getAttribute("data-cal");
      if (act === "close") close();
      if (act === "prev") shift(-1);
      if (act === "next") shift(1);
      if (act === "clear") {
        start = "";
        end = "";
        render();
      }
      if (act === "ok") confirmPick();
    });
  }

  function shift(delta) {
    monthKey = DateUtil.addMonths(monthKey, delta);
    render();
  }

  function pick(ymd) {
    if (mode === "single") {
      start = ymd;
      end = ymd;
    } else if (!start || (start && end)) {
      start = ymd;
      end = "";
    } else if (ymd < start) {
      end = start;
      start = ymd;
    } else {
      end = ymd;
    }
    render();
  }

  function confirmPick() {
    if (mode === "range" && start && !end) end = start;
    if (!start) {
      hintEl.textContent = "날짜를 고르세요.";
      return;
    }
    var s = start;
    var e = mode === "range" ? end : start;
    close();
    if (onDone) onDone(s, e);
  }

  function render() {
    monthEl.textContent = DateUtil.monthLabel(monthKey);
    var days = DateUtil.daysOfMonth(monthKey);
    var firstWeekday = DateUtil.weekday(days[0]);
    var html = "";
    var i;
    for (i = 0; i < firstWeekday; i++) html += '<span class="cal-empty"></span>';
    for (i = 0; i < days.length; i++) {
      var ymd = days[i];
      var cls = "cal-day";
      if (DateUtil.isWeekend(ymd)) cls += " weekend";
      if (ymd === DateUtil.today()) cls += " today";
      if (start && ymd === start) cls += " selected";
      if (end && ymd === end) cls += " selected";
      if (start && end && ymd > start && ymd < end) cls += " in-range";
      html += '<button type="button" class="' + cls + '" data-ymd="' + ymd + '">' + Number(ymd.slice(8)) + "</button>";
    }
    gridEl.innerHTML = html;
    if (mode === "range") {
      hintEl.textContent = start && end ? start + " ~ " + end : start ? start + " ~ 종료일을 고르세요" : "시작일과 종료일을 차례로 고르세요.";
    } else {
      hintEl.textContent = start ? start : "날짜를 고르세요.";
    }
  }

  function open(options) {
    ensure();
    options = options || {};
    mode = options.mode || "single";
    onDone = options.onSelect || null;
    start = options.start || "";
    end = options.end || start;
    monthKey = DateUtil.monthKey(start || DateUtil.today());
    titleEl.textContent = options.title || (mode === "range" ? "기간 선택" : "날짜 선택");
    overlay.classList.add("open");
    render();
    gridEl.onclick = function (e) {
      var day = e.target.closest("[data-ymd]");
      if (day) pick(day.getAttribute("data-ymd"));
    };
  }

  function close() {
    if (overlay) overlay.classList.remove("open");
  }

  function bindField(button, options) {
    button.addEventListener("click", function () {
      open({
        mode: options.mode || "single",
        title: options.title,
        start: button.getAttribute("data-start") || "",
        end: button.getAttribute("data-end") || "",
        onSelect: function (s, e) {
          button.setAttribute("data-start", s);
          button.setAttribute("data-end", e);
          button.textContent = options.mode === "range" ? s + " ~ " + e : s;
          if (options.onChange) options.onChange(s, e, button);
        }
      });
    });
  }

  function read(button) {
    return {
      start: button.getAttribute("data-start") || "",
      end: button.getAttribute("data-end") || ""
    };
  }

  function write(button, startYmd, endYmd, range) {
    button.setAttribute("data-start", startYmd || "");
    button.setAttribute("data-end", endYmd || startYmd || "");
    if (!startYmd) {
      button.textContent = range ? "기간 선택" : "날짜 선택";
      return;
    }
    button.textContent = range ? startYmd + " ~ " + (endYmd || startYmd) : startYmd;
  }

  return { open: open, close: close, bindField: bindField, read: read, write: write };
})();
