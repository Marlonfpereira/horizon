export const test = `
func hello() begin
  call write_string("Hello, world!\\n")
end

call hello()
`.trim();
