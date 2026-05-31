'use client';

import { useState } from 'react';
import { Button } from 'react-bootstrap';
import ChartComponent from '@/components/ChartComponent';
import MonthPicker from '@/components/MonthPicker';
import exportToPDF from '@/utils/exportToPDF';

// All four data sets arrive pre-shaped and pre-formatted from the server
// component. This island just renders the charts and offers a PDF export.
export default function ChartsClient({
  categoryData,
  monthlyData,
  budgetData,
  dailyData,
  monthLabel,
  monthDisplay,
  prevMonth,
  nextMonth,
}) {
  const [isExporting, setIsExporting] = useState(false);

  const exportPDF = async () => {
    setIsExporting(true);
    try {
      await exportToPDF('charts-section', 'financial-charts.pdf');
    } finally {
      setIsExporting(false);
    }
  };

  const isEmpty =
    !categoryData.length &&
    !monthlyData.length &&
    !budgetData.length &&
    !dailyData.length;

  return (
    <div className='container py-3'>
      <div className='d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3'>
        <div className='d-flex flex-wrap align-items-center gap-3'>
          <h2 className='fw-bold mb-0'>Financial Charts</h2>
          <MonthPicker
            label={monthLabel}
            display={monthDisplay}
            prev={prevMonth}
            next={nextMonth}
            noFuture
          />
        </div>
        <Button
          variant='primary'
          onClick={exportPDF}
          disabled={isEmpty || isExporting}
        >
          {isExporting ? (
            <>
              <span className='spinner-border spinner-border-sm me-2' />
              Exporting…
            </>
          ) : (
            <>
              <i className='bi bi-file-earmark-pdf me-2'></i>
              Export Report
            </>
          )}
        </Button>
      </div>

      <div id='charts-section' className='row g-4'>
        {categoryData.length > 0 && (
          <div className='col-12 col-lg-6'>
            <ChartComponent
              title='Spending by Category'
              type='pie'
              labels={categoryData.map((item) => item.category)}
              data={categoryData.map((item) => item.total)}
            />
          </div>
        )}

        {monthlyData.length > 0 && (
          <div className='col-12 col-lg-6'>
            <ChartComponent
              title='Monthly Spending Trend'
              type='line'
              labels={monthlyData.map((item) => item.month)}
              data={monthlyData.map((item) => item.total)}
            />
          </div>
        )}

        {budgetData.length > 0 && (
          <div className='col-12'>
            <ChartComponent
              title='Budget vs Actual Spending'
              type='bar'
              labels={budgetData.map((item) => item.category)}
              datasets={[
                {
                  label: 'Budget',
                  data: budgetData.map((item) => item.budget ?? 0),
                  backgroundColor: 'rgba(75, 192, 192, 0.6)',
                  borderColor: 'rgba(75, 192, 192, 1)',
                },
                {
                  label: 'Actual',
                  data: budgetData.map((item) => item.spent ?? 0),
                  backgroundColor: 'rgba(255, 159, 64, 0.6)',
                  borderColor: 'rgba(255, 159, 64, 1)',
                },
              ]}
            />
          </div>
        )}

        {dailyData.length > 0 && (
          <div className='col-12'>
            <ChartComponent
              title='Daily Expense Summary'
              type='bar'
              labels={dailyData.map((item) => item.date)}
              data={dailyData.map((item) => item.total)}
            />
          </div>
        )}

        {isEmpty && (
          <div className='col-12'>
            <div className='card shadow-sm'>
              <div className='card-body text-center py-5'>
                <i className='bi bi-bar-chart fs-1 text-muted mb-3'></i>
                <h4 className='mb-3'>No Chart Data Available</h4>
                <p className='text-muted'>
                  Your financial charts will appear here once you have
                  transaction data.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
