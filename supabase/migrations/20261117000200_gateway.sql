-- The mobile clients never receive this login. The deployment sets a generated password separately.
create role offrally_gateway login noinherit;
revoke execute on function public.club_round(text,text,text,integer) from authenticated;
grant usage on schema public to offrally_gateway;
grant execute on function public.club_round(text,text,text,integer) to offrally_gateway;
