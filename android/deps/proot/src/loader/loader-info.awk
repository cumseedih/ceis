# Note: This file is included only for targets which have pokedata workaround
#
# Portable awk: no gawk extensions. strtonum() is replaced by hex() and the
# \y word boundaries by an exact match on the symbol name, which `readelf -s`
# prints as the last field. Works with gawk, mawk and BWK awk.
function hex(s,    i, c, v) {
	s = tolower(s)
	v = 0
	for (i = 1; i <= length(s); i++) {
		c = index("0123456789abcdef", substr(s, i, 1))
		if (c == 0) break
		v = v * 16 + (c - 1)
	}
	return v
}
$NF == "pokedata_workaround" {pokedata_workaround=hex($2)}
$NF == "_start" {start=hex($2)}
END {
	print "#include <unistd.h>"
	print "const ssize_t offset_to_pokedata_workaround=" (pokedata_workaround-start) ";"
}
