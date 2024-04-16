export const one_to_ten = `
t0: u8 = 0u8
loop:
  if t0 >= 10u8 goto done
  t0: u8 = t0 + 1u8
  goto loop
done:
`.trim();
