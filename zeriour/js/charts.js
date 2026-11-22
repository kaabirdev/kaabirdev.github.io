/* ==========================================================================
   Zeriour — Chart.js theming helpers
   Every chart is registered so theme changes and re-renders stay clean.
   ========================================================================== */
window.ZR = window.ZR || {};
(function (ZR) {
  'use strict';

  const charts = {};
  ZR.charts = charts;
  const instances = new Map();

  charts.available = () => typeof window.Chart !== 'undefined';
  charts.registry = instances;

  function css(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  charts.tokens = () => ({
    primary: css('--primary') || '#2563eb',
    accent: css('--accent') || '#06b6d4',
    success: css('--success') || '#0d9b6c',
    warn: css('--warn') || '#c2760a',
    danger: css('--danger') || '#d92d3c',
    violet: css('--violet') || '#6d4aff',
    sky: css('--sky') || '#0b7fc4',
    line: css('--line') || '#e3eaf3',
    lineSoft: css('--line-soft') || '#eef2f8',
    ink: css('--ink') || '#0a1728',
    muted: css('--muted') || '#64778f',
    faint: css('--faint') || '#8b9cb2',
    surface: css('--surface') || '#fff',
    isDark: document.documentElement.classList.contains('dark')
  });

  charts.palette = () => {
    const t = charts.tokens();
    return [t.primary, t.accent, t.violet, t.success, t.warn, t.sky, t.danger, t.faint];
  };

  if (typeof window.Chart !== 'undefined') {
    Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
    Chart.defaults.font.size = 11;
    Chart.defaults.font.weight = '500';
    Chart.defaults.animation.duration = 650;
    Chart.defaults.animation.easing = 'easeOutQuart';
    Chart.defaults.plugins.legend.display = false;
    Chart.defaults.plugins.tooltip.enabled = true;

    // centre label plugin for doughnuts
    Chart.register({
      id: 'zrCenterText',
      afterDraw(chart, args, opts) {
        if (!opts || !opts.text) return;
        const { ctx, chartArea } = chart;
        const x = (chartArea.left + chartArea.right) / 2;
        const y = (chartArea.top + chartArea.bottom) / 2;
        const t = charts.tokens();
        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = t.ink;
        ctx.font = '700 20px "Plus Jakarta Sans", Inter, sans-serif';
        ctx.fillText(opts.text, x, y - 3);
        if (opts.sub) {
          ctx.fillStyle = t.muted;
          ctx.font = '500 10px Inter, sans-serif';
          ctx.fillText(opts.sub, x, y + 15);
        }
        ctx.restore();
      }
    });
  }

  function baseOptions(extra = {}) {
    const t = charts.tokens();
    const legend = extra.legend !== false;
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      layout: { padding: { top: 6, right: 6, bottom: 0, left: 0 } },
      plugins: {
        legend: legend ? {
          display: true,
          position: 'bottom',
          align: 'start',
          labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, pointStyle: 'circle', padding: 16, color: t.muted, font: { size: 11, weight: '500' } }
        } : { display: false },
        tooltip: {
          backgroundColor: t.isDark ? '#152740' : '#0a1728',
          titleColor: '#fff',
          bodyColor: '#c8d5e5',
          titleFont: { size: 11, weight: '600' },
          bodyFont: { size: 11 },
          padding: 10,
          cornerRadius: 8,
          displayColors: true,
          boxWidth: 7,
          boxHeight: 7,
          usePointStyle: true,
          borderColor: t.isDark ? '#2a3f5c' : 'rgba(255,255,255,.08)',
          borderWidth: 1
        }
      },
      scales: extra.scales === false ? undefined : {
        x: {
          grid: { display: false, drawBorder: false },
          border: { display: false },
          ticks: { color: t.faint, font: { size: 10 }, maxRotation: 0, autoSkipPadding: 14 }
        },
        y: {
          beginAtZero: true,
          grid: { color: t.lineSoft, drawBorder: false, drawTicks: false },
          border: { display: false, dash: [3, 3] },
          ticks: { color: t.faint, font: { size: 10 }, padding: 6, maxTicksLimit: 5 },
          ...(extra.y || {})
        }
      },
      ...extra.overrides
    };
  }

  function gradient(ctx, area, color) {
    const g = ctx.createLinearGradient(0, area.top, 0, area.bottom);
    g.addColorStop(0, color + '38');
    g.addColorStop(1, color + '00');
    return g;
  }

  charts.destroy = function (id) {
    if (instances.has(id)) {
      try { instances.get(id).destroy(); } catch (e) { /* noop */ }
      instances.delete(id);
    }
  };

  charts.make = function (canvasOrId, config) {
    const canvas = typeof canvasOrId === 'string' ? document.getElementById(canvasOrId) : canvasOrId;
    if (!canvas) return null;
    const id = canvas.id || 'chart';
    charts.destroy(id);
    if (!charts.available()) {
      const parent = canvas.parentElement;
      if (parent) parent.innerHTML = `<div class="empty-inline">${ZR.ui.icon('chart-line')} Charts need the Chart.js CDN — check your connection.</div>`;
      return null;
    }
    const chart = new Chart(canvas, config);
    instances.set(id, chart);
    return chart;
  };

  const fmt = (n) => (ZR.ui ? ZR.ui.money(n) : n);

  charts.areaLine = function (id, { labels, series, yFormatter, legend = true }) {
    const t = charts.tokens();
    const colors = charts.palette();
    return charts.make(id, {
      type: 'line',
      data: {
        labels,
        datasets: series.map((s, i) => {
          const color = s.color || colors[i % colors.length];
          return {
            label: s.label, data: s.data, borderColor: color, borderWidth: 2,
            pointRadius: 0, pointHoverRadius: 4, pointHoverBackgroundColor: color,
            pointHoverBorderColor: '#fff', pointHoverBorderWidth: 2,
            tension: 0.38, fill: s.fill === false ? false : true,
            backgroundColor: (ctx) => {
              const { chart } = ctx;
              const { ctx: c, chartArea } = chart;
              if (!chartArea) return color + '20';
              return gradient(c, chartArea, color);
            }
          };
        })
      },
      options: {
        ...baseOptions({ legend }),
        plugins: {
          ...baseOptions({ legend }).plugins,
          tooltip: {
            ...baseOptions({ legend }).plugins.tooltip,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${yFormatter ? yFormatter(ctx.parsed.y) : ctx.parsed.y}`
            }
          }
        }
      }
    });
  };

  charts.bars = function (id, { labels, series, stacked = false, horizontal = false, legend = true, yFormatter }) {
    const colors = charts.palette();
    return charts.make(id, {
      type: 'bar',
      data: {
        labels,
        datasets: series.map((s, i) => ({
          label: s.label, data: s.data,
          backgroundColor: s.color || colors[i % colors.length],
          borderRadius: 4, borderSkipped: false,
          maxBarThickness: 26, stack: stacked ? 'a' : undefined
        }))
      },
      options: {
        ...baseOptions({ legend }),
        indexAxis: horizontal ? 'y' : 'x',
        scales: horizontal ? {
          x: { beginAtZero: true, grid: { color: charts.tokens().lineSoft, drawTicks: false }, border: { display: false }, ticks: { color: charts.tokens().faint, font: { size: 10 } } },
          y: { grid: { display: false }, border: { display: false }, ticks: { color: charts.tokens().faint, font: { size: 10 } } }
        } : baseOptions().scales,
        plugins: {
          ...baseOptions({ legend }).plugins,
          tooltip: {
            ...baseOptions({ legend }).plugins.tooltip,
            callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${yFormatter ? yFormatter(ctx.parsed.y ?? ctx.parsed.x) : (ctx.parsed.y ?? ctx.parsed.x)}` }
          }
        }
      }
    });
  };

  charts.doughnut = function (id, { labels, data, colors, centerLabel, centerSub, cutout = '70%' }) {
    return charts.make(id, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors || charts.palette(),
          borderColor: charts.tokens().surface,
          borderWidth: 2,
          hoverOffset: 3
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout,
        layout: { padding: 4 },
        plugins: {
          legend: {
            display: true, position: 'right', align: 'center',
            labels: { boxWidth: 7, boxHeight: 7, usePointStyle: true, pointStyle: 'circle', padding: 11, color: charts.tokens().muted, font: { size: 10.5 } }
          },
          tooltip: {
            ...baseOptions({ legend: false }).plugins.tooltip,
            callbacks: { label: (ctx) => ` ${ctx.label}: ${fmt(ctx.parsed)}` }
          },
          zrCenterText: { text: centerLabel || '', sub: centerSub || '' }
        }
      }
    });
  };

  /* keep charts legible when the theme flips */
  window.addEventListener('zr:theme', () => {
    instances.forEach((chart) => {
      const t = charts.tokens();
      if (chart.options.plugins && chart.options.plugins.tooltip) {
        chart.options.plugins.tooltip.backgroundColor = t.isDark ? '#152740' : '#0a1728';
      }
      if (chart.options.scales) {
        Object.values(chart.options.scales).forEach((sc) => {
          if (sc.grid) sc.grid.color = t.lineSoft;
          if (sc.ticks) sc.ticks.color = t.faint;
        });
      }
      chart.update('none');
    });
  });
})(window.ZR);
