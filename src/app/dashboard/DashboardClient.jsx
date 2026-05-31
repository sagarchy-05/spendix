'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FaChartBar,
  FaWallet,
  FaPiggyBank,
  FaLightbulb,
  FaArrowRight,
} from 'react-icons/fa';

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export default function DashboardClient({ userName, quote, stats }) {
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening');
  }, []);

  const features = [
    {
      title: 'Transactions',
      desc: 'Log, edit, and review your expenses.',
      icon: <FaWallet />,
      tone: 'primary',
      meta:
        stats.txCount === 0
          ? 'No transactions yet'
          : `${stats.txCount} this month`,
      link: '/transactions',
    },
    {
      title: 'Budgets',
      desc: 'Set spending limits per category.',
      icon: <FaPiggyBank />,
      tone: 'success',
      meta:
        stats.budgetCount === 0
          ? 'No budgets set'
          : `${stats.budgetCount} categor${stats.budgetCount === 1 ? 'y' : 'ies'}`,
      link: '/budgets',
    },
    {
      title: 'Charts',
      desc: 'Visualize spending trends and daily activity.',
      icon: <FaChartBar />,
      tone: 'info',
      meta: 'Monthly + history',
      link: '/charts',
    },
    {
      title: 'AI Insights',
      desc: 'Personalized advice from Gemini.',
      icon: <FaLightbulb />,
      tone: 'warning',
      meta: '1 generation / hour',
      link: '/insights',
    },
  ];

  return (
    <div className='py-4 flex-grow-1 d-flex flex-column justify-content-center gap-4 gap-xl-5'>
      {/* Hero greeting */}
      <section className='spx-hero'>
        <div className='row align-items-center g-3'>
          <div className='col-12 col-md-7'>
            <h1 className='spx-hero-greeting'>
              {greeting ? `Good ${greeting}` : 'Welcome'}
              {userName ? `, ${userName}` : ''}
            </h1>
            <p className='spx-hero-sub'>
              Here&apos;s how {stats.monthDisplay} is shaping up.
            </p>
          </div>
          <div className='col-12 col-md-5'>
            <blockquote className='spx-quote'>{quote}</blockquote>
          </div>
        </div>
      </section>

      {/* Stat tiles for the current month */}
      <section className='row g-3'>
        <div className='col-6 col-md-3'>
          <div className='spx-stat'>
            <div className='spx-stat-label'>This month</div>
            <div className='spx-stat-value'>{stats.monthDisplay}</div>
            <div className='spx-stat-meta'>at a glance</div>
          </div>
        </div>
        <div className='col-6 col-md-3'>
          <div className='spx-stat'>
            <div className='spx-stat-label'>Spent</div>
            <div className='spx-stat-value'>
              {INR.format(stats.totalSpent)}
            </div>
            <div className='spx-stat-meta'>across all categories</div>
          </div>
        </div>
        <div className='col-6 col-md-3'>
          <div className='spx-stat'>
            <div className='spx-stat-label'>Transactions</div>
            <div className='spx-stat-value'>{stats.txCount}</div>
            <div className='spx-stat-meta'>
              {stats.txCount === 1 ? 'entry logged' : 'entries logged'}
            </div>
          </div>
        </div>
        <div className='col-6 col-md-3'>
          <div className='spx-stat'>
            <div className='spx-stat-label'>Over budget</div>
            <div className='spx-stat-value'>{stats.overBudgetCount}</div>
            <div
              className={`spx-stat-meta ${
                stats.overBudgetCount > 0 ? 'is-danger' : 'is-success'
              }`}
            >
              {stats.overBudgetCount > 0
                ? stats.overBudgetCount === 1
                  ? 'category needs attention'
                  : 'categories need attention'
                : 'everything on track'}
            </div>
          </div>
        </div>
      </section>

      {/* Feature shortcuts */}
      <section className='row g-3 g-md-4'>
        {features.map((f) => (
          <div className='col-12 col-sm-6 col-lg-3' key={f.title}>
            <Link href={f.link} className='spx-feature'>
              <div className={`spx-feature-icon spx-feature-icon--${f.tone}`}>
                {f.icon}
              </div>
              <div className='spx-feature-title'>{f.title}</div>
              <p className='spx-feature-desc'>{f.desc}</p>
              <div className='spx-feature-meta'>
                <span>{f.meta}</span>
                <FaArrowRight className='arrow' size={14} />
              </div>
            </Link>
          </div>
        ))}
      </section>
    </div>
  );
}
