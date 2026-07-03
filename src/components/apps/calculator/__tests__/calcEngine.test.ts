import { operate, percent, applyPercent, scientific } from '../calcEngine';

test('operate handles basic arithmetic', () => {
  expect(operate(2, '+', 3)).toBe(5);
  expect(operate(2, '-', 3)).toBe(-1);
  expect(operate(2, '*', 3)).toBe(6);
  expect(operate(6, '/', 3)).toBe(2);
});

test('operate divides by zero into NaN', () => {
  expect(Number.isNaN(operate(5, '/', 0))).toBe(true);
});

test('percent resolves add/subtract as a share of the accumulator', () => {
  expect(percent(200, '+', 10)).toBe(20);
  expect(percent(200, '-', 10)).toBe(20);
});

test('percent resolves multiply/divide as a plain scale factor', () => {
  expect(percent(200, '*', 10)).toBe(0.1);
  expect(percent(200, '/', 10)).toBe(0.1);
});

test('applyPercent: A + B% = A + A*(B/100)', () => {
  expect(applyPercent(200, '+', 10)).toBe(220);
});

test('applyPercent: A - B% = A - A*(B/100)', () => {
  expect(applyPercent(200, '-', 10)).toBe(180);
});

test('applyPercent: A * B% = A * (B/100)', () => {
  expect(applyPercent(200, '*', 10)).toBe(20);
});

test('applyPercent: A / B% = A / (B/100)', () => {
  expect(applyPercent(200, '/', 10)).toBe(2000);
});

test('scientific trig respects degree mode', () => {
  expect(scientific.sin(90, 'deg')).toBeCloseTo(1);
  expect(scientific.cos(180, 'deg')).toBeCloseTo(-1);
});

test('scientific trig respects radian mode', () => {
  expect(scientific.sin(Math.PI / 2, 'rad')).toBeCloseTo(1);
});

test('scientific log/ln/pow/sqrt', () => {
  expect(scientific.log(100)).toBeCloseTo(2);
  expect(scientific.ln(Math.E)).toBeCloseTo(1);
  expect(scientific.pow(2, 10)).toBe(1024);
  expect(scientific.sqrt(9)).toBe(3);
});

test('scientific constants', () => {
  expect(scientific.pi()).toBeCloseTo(Math.PI);
  expect(scientific.e()).toBeCloseTo(Math.E);
});
