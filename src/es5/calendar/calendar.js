(function(root, factory) {
  if (typeof define === "function" && define.amd) {
    define([], factory);
  } else if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.Calendar = factory();
  }
})(typeof self !== "undefined" ? self : this, function() {
  "use strict";

  // 基于MVVM思想来实现，参考收藏的文章
  // 用mvvm重构目前的代码 再加入选择月份和年限的功能
  // 最小和最大年份限制

  // 用发布订阅模式  模板字符串函数  局部刷新 重构

  // var monthMax = 31;
  // var rowMax = 0;
  // if (this.monthMax % this.calendarWeeks.length === 0) {
  //   rowMax = this.monthMax / this.calendarWeeks.length;
  // } else if (this.monthMax % this.calendarWeeks.length === 1) {
  //   rowMax = this.monthMax / this.calendarWeeks.length + 1;
  // } else {
  //   rowMax = this.monthMax / this.calendarWeeks.length + 2;
  // }
  // this.calendarDaysCount = this.calendarWeeks.length * rowMax;

  // new Date(8640000000000000)
  // Sat Sep 13 275760 08:00:00 GMT+0800 (中国标准时间)
  // new Date(-8640000000000000)
  // Tue Apr 20 -271821 08:05:43 GMT+0805 (中国标准时间)
  // new Date('99-5-20')
  // Thu May 20 1999 00:00:00 GMT+0800 (中国标准时间)

  var CLASS = {
    CALENDAR_WRAP: "calendar-wrap",
    CALENDAR_TITLE: "calendar-title",
    CALENDAR_PREV: "calendar-prev",
    CALENDAR_TIME: "calendar-time",
    CALENDAR_NEXT: "calendar-next",
    CALENDAR_CONTENT: "calendar-content",
    CALENDAR_WEEKS: "calendar-weeks",
    CALENDAR_WEEK: "calendar-week",
    CALENDAR_DAYS: "calendar-days",
    CALENDAR_DAY: "calendar-day",
    CALENDAR_DAY_CURRENT: "calendar-day current",
    CALENDAR_DAY_SELECT: "calendar-day select"
  };

  var ID = {
    CALENDAR_DATE: "calendarDate",
    CALENDAR_DATE_TIME: "calendarDateTime",
    CALENDAR_DATE_PREV: "calendarDatePrev",
    CALENDAR_DATE_NEXT: "calendarDateNext"
  };

  // Polyfills
  function addEvent(element, type, handler) {
    if (element.addEventListener) {
      element.addEventListener(type, handler, false);
    } else if (element.attachEvent) {
      element.attachEvent("on" + type, handler);
    } else {
      element["on" + type] = handler;
    }
  }

  // 合并对象
  function extend(o, n, override) {
    for (var p in n) {
      if (n.hasOwnProperty(p) && (!o.hasOwnProperty(p) || override))
        o[p] = n[p];
    }
  }

  var Calendar = function(selector, userOptions) {
    // 合并配置
    extend(this.calendarOptions, userOptions, true);
    // 初始化
    this._initCalendar(selector);
    // 日历设置时间（默认为当前时间）
    this.calendarTime = this.formatDate(
      this.calendarOptions.time,
      "yyyy-MM-dd"
    ).date;
    // 日历显示时间
    this.calendarShowTime = this.formatDate(
      this.calendarOptions.time,
      "yyyy-MM"
    ).date;
    this.refreshCalendar(new Date(this.calendarOptions.time));
    this.calendarOptions.callback &&
      this.calendarOptions.callback(this.calendarTime);
  };
  Calendar.prototype = {
    calendarOptions: {},
    _initCalendar: function(selector) {
      // 获取日历元素
      this.calendar = document.querySelector(selector);
      // 避免出现选中效果
      this.calendar.onselectstart = function() {
        return false;
      };
      // 因为一周有7天，一个月最多有31天，一个月最多能横跨6行，所以至少要7*6=42个格子，其余的格子用前后月份日期补足
      this.calendarWeeks = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
      // 每个月最大天数
      this.calendarMaxDay = 31;
      // 最大日期
      this.calendarMax = this.formatDate(
        new Date(8640000000000000),
        "yyyy-MM-dd"
      ).date;
      // 最小日期
      this.calendarMin = "100-01-01";
      // 日历行数
      this.calendarRow =
        Math.floor(this.calendarMaxDay / this.calendarWeeks.length) + 2;
      // 要显示的日期数
      this.calendarDaysCount = this.calendarWeeks.length * this.calendarRow;
    },
    refreshCalendar: function(date) {
      // 设置所有要显示的日期
      this._setCalendarDays(date);
      // 渲染DOM
      this._renderCalendar();
      // 获取日历元素
      this._getCalendar();
      // 绑定事件
      this._bindCalendar();
    },
    _getCalendar: function() {
      this.calendarDateElem = document.querySelector("#" + ID.CALENDAR_DATE);
      this.calendarDayElems = document.querySelectorAll(
        "." + CLASS.CALENDAR_DAY
      );
      this.calendarContentElem = document.querySelector(
        "." + CLASS.CALENDAR_CONTENT
      );
      this.calendarDateTimeElem = document.querySelector(
        "#" + ID.CALENDAR_DATE_TIME
      );
      this.calendarDatePrev = document.querySelector(
        "#" + ID.CALENDAR_DATE_PREV
      );
      this.calendarDateNext = document.querySelector(
        "#" + ID.CALENDAR_DATE_NEXT
      );
    },
    _setCalendarDays: function(date) {
      // 保存所有要显示的日期
      this.calendarDays = [];
      // 设置上个月显示日期
      this._setCalendarDaysInPrevMonth(date);
      // 设置当前月的显示日期
      this._setCalendarDaysInCurrentMonth(date);
      // 设置下个月显示日期
      this._setCalendarDaysInNextMonth(date);
    },
    _setCalendarDaysInPrevMonth: function(date) {
      // 获取当前月第一天是星期几
      var week = this.getFirstDateInMonth(date).getDay();
      // 获取上个月最后一天的日期
      var end = this.getLastDateInPrevMonth(date).getDate();
      // 判断第一天是否是星期日 设置起始日期
      var start =
        week === 0 ? end - this.calendarWeeks.length + 1 : end - week + 1;
      this._setCalendarDaysInMonth(
        date.getMonth() < 1 ? date.getFullYear() - 1 : date.getFullYear(),
        date.getMonth() < 1 ? 12 : date.getMonth(),
        start,
        end,
        false
      );
    },
    _setCalendarDaysInCurrentMonth: function(date) {
      // 获取当前月最后一天的日期
      var end;
      // 判断是否是最后一个月的日期
      if (this.isLastDate(date.getFullYear(), date.getMonth() + 1)) {
        end = new Date(this.calendarMax).getDate();
      } else {
        end = this.getLastDateInMonth(date).getDate();
      }
      this._setCalendarDaysInMonth(
        date.getFullYear(),
        date.getMonth() + 1,
        1,
        end,
        true
      );
    },
    _setCalendarDaysInNextMonth: function(date) {
      // 判断是否是最后一个月的日期
      if (!this.isLastDate(date.getFullYear(), date.getMonth() + 1)) {
        if (this.calendarDays.length != this.calendarDaysCount) {
          this._setCalendarDaysInMonth(
            date.getMonth() + 2 > 12
              ? date.getFullYear() + 1
              : date.getFullYear(),
            date.getMonth() + 2 > 12 ? 1 : date.getMonth() + 2,
            1,
            this.calendarDaysCount - this.calendarDays.length,
            false
          );
        }
      }
    },
    _setCalendarDaysInMonth: function(year, month, start, end, isCurrent) {
      for (var day = start, len = end; day <= len; day++) {
        this.calendarDays.push({
          year: year,
          month: month,
          day: day,
          isCurrent: isCurrent
        });
      }
    },
    _renderCalendar: function() {
      var template =
        '<div class="calendar-wrap" id="calendarDate">' +
        "{{calendarShowTime}}" +
        '<table class="calendar-content">' +
        "{{calendarWeeks}}" +
        "{{calendarDays}}" +
        "</table>" +
        "</div>";
      this.calendar.innerHTML = template
        .replace("{{calendarShowTime}}", this._renderCalendarTitle())
        .replace("{{calendarWeeks}}", this._renderCalendarWeeks())
        .replace("{{calendarDays}}", this._renderCalendarDays());
      // // 第一种模式：显示天数
    },
    _renderCalendarTitle: function() {
      return (
        '<div class="calendar-title">' +
        '<span class="calendar-prev" id="calendarDatePrev">&lt;</span>' +
        '<span class="calendar-time" id="calendarDateTime">' +
        this.calendarShowTime +
        "</span>" +
        '<span class="calendar-next" id="calendarDateNext">&gt;</span>' +
        "</div>"
      );
    },
    _renderCalendarWeeks: function() {
      var html = "";
      for (var i = 0; i < this.calendarWeeks.length; i++) {
        html += '<th class="calendar-week">' + this.calendarWeeks[i] + "</th>";
      }
      return '<tr class="calendar-weeks">' + html + "</tr>";
    },
    _renderCalendarDays: function() {
      var html = "",
        dom = [],
        calendarDays = [];
      var len = this.calendarWeeks.length;
      for (var i = 0; i < this.calendarRow; i++) {
        html = "";
        html += '<tr class="calendar-days">';
        calendarDays = this.calendarDays.slice(i * len, i * len + len);
        for (var j = 0; j < calendarDays.length; j++) {
          if (calendarDays[j].isCurrent) {
            if (
              this.formatDate(
                new Date(
                  calendarDays[j].year,
                  calendarDays[j].month - 1,
                  calendarDays[j].day
                ),
                "yyyy-MM-dd"
              ).date === this.calendarTime
            ) {
              html +=
                '<td class="calendar-day select">' +
                calendarDays[j].day +
                "</td>";
            } else {
              html +=
                '<td class="calendar-day current">' +
                calendarDays[j].day +
                "</td>";
            }
          } else {
            html += '<td class="calendar-day">' + calendarDays[j].day + "</td>";
          }
        }
        html += "</tr>";
        dom.push(html);
      }
      return dom.join("");
    },
    _bindCalendar: function() {
      var year = new Date(this.calendarShowTime).getFullYear();
      var month = new Date(this.calendarShowTime).getMonth() + 1;
      this._bindCalendarContent();
      this._bindCalendarPrev(year, month);
      this._bindCalendarNext(year, month);
    },
    _bindCalendarContent: function() {
      var _this = this;
      var arr = [];
      addEvent(this.calendarContentElem, "click", function(ev) {
        var e = ev || window.event;
        var target = e.target || e.srcElement;
        if (target.nodeName.toLocaleLowerCase() == "td") {
          for (var i = 0; i < _this.calendarDayElems.length; i++) {
            if (_this.calendarDayElems[i] === target) {
              _this.calendarTime = _this.formatDate(
                new Date(
                  _this.calendarDays[i].year,
                  _this.calendarDays[i].month - 1,
                  _this.calendarDays[i].day
                ),
                "yyyy-MM-dd"
              ).date;
              _this.calendarShowTime = _this.formatDate(
                new Date(
                  _this.calendarDays[i].year,
                  _this.calendarDays[i].month - 1,
                  _this.calendarDays[i].day
                ),
                "yyyy-MM"
              ).date;
              _this.refreshCalendar(new Date(_this.calendarTime));
            }
          }
          _this.calendarOptions.callback &&
            _this.calendarOptions.callback(_this.calendarTime);
        }
      });
    },
    _bindCalendarPrev: function(year, month) {
      var _this = this;
      addEvent(this.calendarDatePrev, "click", function(ev) {
        month--;
        if (month < 1) {
          month = 12;
          year--;
        }
        _this.calendarShowTime = _this.formatDate(
          new Date(year, month - 1, new Date(_this.calendarTime).getDate()),
          "yyyy-MM"
        ).date;
        _this.refreshCalendar(new Date(_this.calendarShowTime));
      });
    },
    _bindCalendarNext: function(year, month) {
      if (this.isLastDate(year, month)) {
        return;
      }
      var _this = this;
      addEvent(this.calendarDateNext, "click", function(ev) {
        month++;
        if (month > 12) {
          month = 1;
          year++;
        }
        _this.calendarShowTime = _this.formatDate(
          new Date(year, month - 1, new Date(_this.calendarTime).getDate()),
          "yyyy-MM"
        ).date;
        _this.refreshCalendar(new Date(_this.calendarShowTime));
      });
    },
    // 判断是否是最后一月
    isLastDate: function(year, month) {
      return (
        year === new Date(this.calendarMax).getFullYear() &&
        month === new Date(this.calendarMax).getMonth() + 1
      );
    },
    isFirstDate: function(year, month) {
      return (
        year === new Date(this.calendarMin).getFullYear() &&
        month === new Date(this.calendarMin).getMonth() + 1
      );
    },
    /**
     * @description 求当前日期所在月的第一天
     * @param {Date} date 当前日期
     * @return {Date}
     */
    getFirstDateInMonth: function(date) {
      return new Date(date.getFullYear(), date.getMonth(), 1);
    },
    /**
     * @description 求当前日期上个月的最后一天
     * @param {Date} date 当前日期
     * @return {Date}
     */
    getLastDateInPrevMonth: function(date) {
      return new Date(date.getFullYear(), date.getMonth(), 0);
    },
    /**
     * @description 求当前日期所在月的最后一天
     * @param {Date} date 当前日期
     * @return {Date}
     */
    getLastDateInMonth: function(date) {
      return new Date(date.getFullYear(), date.getMonth() + 1, 0);
    },
    /**
     * @description 求某年某月的天数
     * @param {Number} year 年
     * @param {Number} month 月
     * @return {Number}
     */
    daysInMonth: function(year, month) {
      var d = new Date();
      d.setFullYear(year, month == 12 ? 1 : month, 0);
      return d.getDate();
    },
    timeFormat: function(i) {
      i = typeof i == "string" ? parseInt(i) : i;
      return (i < 10 ? "0" : "") + i;
    },
    formatDate: function(time, format) {
      time = typeof time == "string" ? new Date(time) : time;
      var getFullYear = this.timeFormat(time.getFullYear()),
        getMonth = this.timeFormat(time.getMonth() + 1),
        getDate = this.timeFormat(time.getDate()),
        getDay = this.timeFormat(time.getDay());
      return {
        getFullYear: parseInt(getFullYear),
        getMonth: parseInt(getMonth),
        getDate: parseInt(getDate),
        getDay: parseInt(getDay),
        date: format.replace(/yyyy|MM|dd/g, function(a) {
          switch (a) {
            case "yyyy":
              return getFullYear;
              break;
            case "MM":
              return getMonth;
              break;
            case "dd":
              return getDate;
              break;
          }
        })
      };
    },
    constructor: Calendar
  };

  return Calendar;
});
