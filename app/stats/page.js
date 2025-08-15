'use client'
import { useEffect, useState } from 'react'
import { Card } from '../../components/ui/card'
import { Bar, Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend } from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend)

export default function Stats(){
    const [stats, setStats] = useState({ calories: [], ingredients: {}, cost: [] })

    useEffect(()=>{
        let plan = null
        // safe read + parse from localStorage
        try{
            const raw = typeof window !== 'undefined' ? localStorage.getItem('mealPlan') : null
            if(raw) plan = JSON.parse(raw)
        }catch(e){
            console.warn('Invalid mealPlan in localStorage, ignoring it', e)
            plan = null
        }

        if(plan){
            // produce 7-day arrays even if schedule is missing
            const daysCount = 7
            const cals = Array.from({ length: daysCount }, () => Math.round(1800 + Math.random() * 400))
            const cost = Array.from({ length: daysCount }, () => Math.round((plan.budget || 300000) / 7))
            const ingMap = {}
            ;(plan.shopping || []).forEach(it => { ingMap[it.item] = (ingMap[it.item] || 0) + 1 })
            setStats({ calories: cals, ingredients: ingMap, cost })
        }
    },[])

    const labels = ['Sen','Sel','Rab','Kam','Jum','Sab','Min']

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold">Statistik Konsumsi & Nutrisi</h1>
            <div className="grid md:grid-cols-3 gap-4">
                <Card>
                    <h2 className="font-semibold">Kalori Harian</h2>
                    <Line data={{ labels, datasets:[{ label:'Kalori', data: stats.calories, borderColor:'#2563eb', backgroundColor:'#93c5fd' }] }} options={{ responsive:true, plugins:{legend:{display:false}} }} />
                </Card>
                <Card>
                    <h2 className="font-semibold">Estimasi Pengeluaran</h2>
                    <Bar data={{ labels, datasets:[{ label:'Rp', data: stats.cost, backgroundColor:'#10b981' }] }} options={{ responsive:true, plugins:{legend:{display:false}} }} />
                </Card>
                <Card>
                    <h2 className="font-semibold">Variasi Bahan</h2>
                    <ul className="text-sm list-disc pl-4 max-h-64 overflow-auto">
                        {Object.entries(stats.ingredients).map(([k,v])=> <li key={k}>{k} – {v}x</li>)}
                    </ul>
                </Card>
            </div>
        </div>
    )
}
