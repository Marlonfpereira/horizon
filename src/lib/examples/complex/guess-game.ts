export const guess_game = `
call write_string("Welcome to the Guess Game! Please choose a number between 1 and 10.\\n")
t1: i32 = 5 # no random as of right now

try_again:
  call write_string("Please enter your guess: \\n")
  t4: i32 = call read_int()

  if t4 == t1  goto win
  if t4 <  t1  goto too_low
  if t4 >  t1  goto too_high

too_low:
  call write_string("Too low! Try again.\\n")
  goto try_again

too_high:
  call write_string("Too high! Try again.\\n")
  goto try_again

win: call write_string("Congratulations! You guessed the correct number!\\n")
`.trim();
