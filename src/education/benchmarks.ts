/**
 * Reference points, so a number has somewhere to stand.
 *
 * All from the 2019 study: the net-zero threshold and the onsite renewable
 * offset from slides 11–12, and the benchmark population from slides 14–15.
 */
export const BENCHMARKS = {
  netZero: { low: 25, high: 30, label: 'Net zero range' },
  onsiteRenewables: { low: 15, high: 30 },
  i2sl: { mean: 531, buildings: 784, below150: 12, label: 'i2SL benchmark mean' },
  carbonNetZero: { low: 0.002, high: 0.003 },
} as const;

export const BENCHMARK_NOTE =
  'Net zero needs roughly 25–30 kBtu/sf/yr because most onsite renewables offset ' +
  '15–30. For scale, the i2SL benchmarking tool holds 784 laboratories with a mean ' +
  'of 531, and just 12 of them below 150.';
