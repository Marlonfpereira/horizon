export const write_string = `
call write_string("Hello, world!\\n")

from_temporary_too: str = "Hello, world!\\n"
call write_string(from_temporary_too)
`.trim();
