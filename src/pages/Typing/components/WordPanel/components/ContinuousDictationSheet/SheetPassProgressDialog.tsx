import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { isOpenDarkModeAtom } from '@/store'
import type { ISheetPass } from '@/utils/db/record'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { useAtomValue } from 'jotai'
import { useEffect, useMemo, useRef } from 'react'

echarts.use([GridComponent, TooltipComponent, LineChart, CanvasRenderer])

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  passes: ISheetPass[]
  title: string
  onViewRecords: (focusPassIndex?: number) => void
}

export default function SheetPassProgressDialog({ open, onOpenChange, passes, title, onViewRecords }: Props) {
  const isDark = useAtomValue(isOpenDarkModeAtom)
  const chartRef = useRef<HTMLDivElement>(null)
  const focusPassRef = useRef<number | undefined>(undefined)

  const chartPoints = useMemo(
    () =>
      passes.map((p, i) => ({
        passIndex: i + 1,
        accuracy: p.accuracy,
        correctCount: p.correctCount,
        wrongCount: p.wrongCount,
      })),
    [passes],
  )

  const latest = passes[passes.length - 1]
  const first = passes[0]
  const delta = latest && first && passes.length > 1 ? latest.accuracy - first.accuracy : null

  useEffect(() => {
    if (!open || !chartRef.current) return
    let chart = echarts.getInstanceByDom(chartRef.current)
    chart?.dispose()
    chart = echarts.init(chartRef.current, isDark ? 'dark' : undefined)

    if (chartPoints.length === 0) {
      chart.clear()
      return
    }

    chart.setOption({
      animation: true,
      animationDuration: 900,
      animationEasing: 'cubicOut',
      animationDurationUpdate: 600,
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          const list = params as Array<{ dataIndex: number }>
          const idx = list[0]?.dataIndex ?? 0
          const point = chartPoints[idx]
          if (!point) return ''
          return `第${point.passIndex}遍<br/>正确率 ${point.accuracy}%（对 ${point.correctCount} · 错 ${point.wrongCount}）`
        },
      },
      grid: { left: 56, right: 28, top: 32, bottom: 40 },
      xAxis: {
        type: 'category',
        data: chartPoints.map((p) => `第${p.passIndex}遍`),
        axisLabel: { color: isDark ? '#94a3b8' : '#64748b', fontSize: 13 },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLabel: { formatter: '{value}%', color: isDark ? '#94a3b8' : '#64748b', fontSize: 13 },
        splitLine: { lineStyle: { color: isDark ? '#334155' : '#e2e8f0' } },
      },
      series: [
        {
          type: 'line',
          smooth: chartPoints.length > 2,
          data: chartPoints.map((p) => p.accuracy),
          symbolSize: 12,
          itemStyle: { color: '#6366f1' },
          lineStyle: { width: 3 },
          areaStyle: { color: 'rgba(99, 102, 241, 0.14)' },
          animationDelay: (idx: number) => idx * 80,
        },
      ],
    })

    chart.off('click')
    chart.on('click', (params: { dataIndex?: number }) => {
      if (params.dataIndex == null) return
      focusPassRef.current = params.dataIndex
      onViewRecords(params.dataIndex)
    })

    return () => {
      chart?.dispose()
    }
  }, [chartPoints, isDark, onViewRecords, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="max-w-3xl gap-5 sm:rounded-xl [&>button]:focus:outline-none [&>button]:focus:ring-0 [&>button]:focus:ring-offset-0"
      >
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">{title}</DialogTitle>
        </DialogHeader>

        {passes.length === 0 ? (
          <p className="py-12 text-center text-base text-slate-500 dark:text-slate-400">
            完整听完并对答案后，离开本章或再练一遍，这里会出现正确率趋势。
          </p>
        ) : (
          <>
            <div ref={chartRef} className="h-72 w-full sm:h-80" />
            {passes.length === 1 && (
              <p className="text-center text-sm text-slate-500 dark:text-slate-400">再完整听写一次，这里会出现趋势折线。</p>
            )}
            <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2 text-base text-slate-700 dark:text-slate-200">
              <p>
                最近一遍：<span className="font-semibold text-indigo-600 dark:text-indigo-300">{latest?.accuracy ?? 0}%</span>
              </p>
              {delta != null ? (
                <p>
                  较首遍：
                  <span
                    className={`font-semibold ${
                      delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {delta >= 0 ? '+' : ''}
                    {delta}%
                  </span>
                </p>
              ) : (
                <p className="text-slate-400">较首遍：—</p>
              )}
            </div>
          </>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="button"
            className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={passes.length === 0}
            onClick={() => onViewRecords(focusPassRef.current)}
          >
            查看听写记录
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
