set positional-arguments

[private]
default:
	@just -l

serve:
	hugo server $@

diff:
	./diff.sh
