#!/usr/bin/perl

use strict;
use CGI qw/:standard/;
use CGI::Cookie;
use JSON;
use Authen::Simple::LDAP;
#use CGI::Carp qw(fatalsToBrowser);
use DBI;
use utf8;

my $dev = 0;

my %config = do '/var/www/config.pl';
if ($ENV{SCRIPT_FILENAME} =~ /y.cgi$/) {
	$config{databasename} .= "dev";
	$dev = 1;
}
my $dsn = "DBI:mysql:database=$config{databasename};host=$config{databasehost}";
my $dbh = DBI->connect($dsn, $config{databaseuser}, $config{databasepass},{mysql_enable_utf8 => 1});

my $createSession = $dbh->prepare("insert into sessions (token, cookiekey, 
							samaccountname, created, level)
					values (?, ?, ?, NOW(), ?)");
my $deleteSession = $dbh->prepare("delete from sessions where token=?");
my $getTecCust = $dbh->prepare("select kunden.name as kunde, dl.kid as kid, kunden.kurz as kurz, techniker, sum(ze+anfahrt) as ze
					from dl 
					join kunden 
					on dl.kid=kunden.id 
					where time_dl between ? and ?
					and (techniker=? or 2=?)
					group by kid, techniker"); 
my $getToken      = $dbh->prepare("select token, samaccountname, level 
					from sessions 
					where cookiekey=?
					and created > NOW() - INTERVAL $config{sessionduration} ");
my $checkSession  = $dbh->prepare("select samaccountname, level from sessions 
					where token=? 
					and cookiekey=?
					and created > NOW() - INTERVAL $config{sessionduration} ");
my $addDl = $dbh->prepare("insert into dl (techniker, kid, time_dl, time_edit, 
					ze, editor, projekt, status, anfahrt)
					values (?, ?, ?, NOW(), ?, ?, ?, 0, ?)");
my $getKid = $dbh->prepare("select id from kunden where kurz=? or name=?");
my (%getUpdatedDl, %updateDl);
foreach (qw(time_dl ze projekt status anfahrt)){
	$updateDl{$_} = $dbh->prepare("update dl set $_=?, time_edit=NOW(), editor=?
						where id=? 
						and (2=? or techniker=?) 
						and $_=?
						and (status=0 or '$_'='status')");
	$getUpdatedDl{$_} = $dbh->prepare("select $_, time_edit, editor from dl where id=? and (2=? or techniker=?)");
}
$updateDl{kunde}    = $dbh->prepare("update dl set kid=(select id from kunden where kurz=?), time_edit=NOW(), editor=?
						where id=? 
						and (2=? or techniker=?) 
						and kid=(select id from kunden where kurz=?)
						and status=0");
$getUpdatedDl{kunde} = $dbh->prepare("select concat(kurz,'dldelim', name), time_edit, editor from kunden 
						join dl on dl.kid=kunden.id
						where dl.id=?
						and (2=? or name=?)");

my $getDl  = $dbh->prepare("select dl.id, dl.techniker, dl.kid, dl.time_dl, dl.time_edit, 
					dl.ze, dl.editor, dl.status, dl.anfahrt,
					kunden.name, dl.projekt, kunden.kurz
				from dl, kunden 
				where kunden.id=dl.kid 
					and (dl.techniker=? or 2=?)
					and time_dl between ? and ?
					and datediff(?,?) < $config{maxdaysinquery}");
my $getTechnicans = $dbh->prepare("select distinct techniker as label
					from dl"); 
my $getCustomers = $dbh->prepare("select kurz as label
					from kunden 
					where kurz is not null
					union select name 
					from kunden");
my $getProjects = $dbh->prepare("select distinct projekt as label 
					from dl 
					where techniker=? and projekt like ? 
					order by time_edit desc 
					limit 15");
my $getDlHistory = $dbh->prepare("select 1 as Aktiv, 
					dl.techniker as Techniker, 
					kunden.kurz as Kunde, 
					dl.projekt as Projekt,
					dl.ze as ZEarbeit, 
					dl.time_dl as ZeitDl,
					dl.time_edit as ZeitEdit,
					dl.anfahrt as ZEfahrt,
					dl.editor as Editor, 
					dl.status as Status, 
					dl.id as id 
				from dl 
				right join kunden on kunden.id=dl.kid 
				where dl.id=? 
					and (dl.techniker=? or 2=?)
				union select 0, 
					dl_history.techniker, 
					kunden.kurz, 
					dl_history.projekt,
					dl_history.ze, 
					dl_history.time_dl,
					dl_history.time_edit,
					dl_history.anfahrt,
					dl_history.editor, 
					dl_history.status, 
					dl_history.id 
				from dl_history 
				right join kunden on dl_history.kid=kunden.id 
				where dl_history.pid=? 
					and (dl_history.techniker=? or 2=?)
				order by Aktiv, id");
my $addCustomer = $dbh->prepare("insert into kunden (name, kurz, rate) values (?, ?, 0)");
my $createDlOtrsRelation = $dbh->prepare("insert into kunden_ticketcustomer (kid, customer_id) 
						values ((select id from kunden where kurz=?), 
							(select split_str(projekt, '\n',2) from dl where id=?))"); #execute($data{value}, $data{id});
my $getOtrsShortName = $dbh->prepare("select split_str(projekt, '\n',2) from dl where id=?");
my $updateDlOtrsEntries = $dbh->prepare("update dl set kid=(select id from kunden where kurz=?) 
						where kid=1 
						and split_str(projekt, '\n',2) = ?");# execute($data{value}, $data{id});
&handle;
sub handle{
	
	charset('UTF-8');
	if(! defined param('POSTDATA')) {
		print header(-type => "application/json", -charset => "utf-8");
		&finalJsonMessage ("no data provided", 1);
	}
	
	my %data =  %{ decode_json param('POSTDATA') }; 
	$data{method} =~ s/[^a-zA-Z0-9]//g;
	$data{nameDl} =~ s/[^a-zA-Z0-9]//g;
	if ( $data{method} ne "login" ){
		print header(-type => "application/json", -charset => "utf-8");
		($data{user}, $data{level}) = &validate($data{token}); 
	}
	if    ( $data{method} eq "login" ) { &login(\%data); }
	elsif ( $data{method} eq "logout" ) { &logout(\%data); }
	elsif ( $data{method} eq "addDl" ) { &addDl(\%data); }
	elsif ( $data{method} eq "getTecCust" ) { &getTecCust(\%data); }
	elsif ( $data{method} eq "updateDl" ) { &updateDl(\%data); }
	elsif ( $data{method} eq "getMyDl" ) { &getMyDl(\%data); }
	elsif ( $data{method} eq "getCustDl" ) { &getCustDl(\%data); }
	elsif ( $data{method} eq "getCustomers" ) { &getCustomers(\%data); }
	elsif ( $data{method} eq "getProjects" ) { &getProjects(\%data); }
	elsif ( $data{method} eq "addCustomer" ) { &addCustomer(\%data); }
	elsif ( $data{method} eq "getDlHistory" ) { &getDlHistory(\%data); }
	else { 
		if($data{level} > 1) {
			if    ( $data{method} eq "getTechnicans" ) { &getTechnicans(\%data); }
		}
	}
}
sub getDlHistory {
	my %data = % { shift() };
	$getDlHistory->execute($data{id}, $data{user}, $data{level}, $data{id}, $data{user}, $data{level}); # or &finalJsonMessage ($DBI::errstr, 2);
	my $table = &sqlToJson($getDlHistory);
	print '{"error":0,"id":"'.$data{id}.'","result":'.$table.'}';
}
	
sub addCustomer {
	my %data = % { shift() };
	
	if(length($data{name}) < 5 or length($data{kurz}) > 4 or length($data{kurz}) == 1) {
		&finalJsonMessage ("ung&uuml;ltige Zeichenanzahl", 2);
	}
#	$data{name} = CGI::escapeHTML($data{name});
#	$data{kurz} = CGI::escapeHTML($data{kurz});
	$data{name} = undef if ($data{name} eq "");
	$data{kurz} = undef if ($data{kurz} eq "");
	if($addCustomer->execute($data{name}, $data{kurz})) {
		&finalJsonMessage("Kunde angelegt", 0);
	} else {
		&finalJsonMessage("Fehler beim anlegen des Kunden: ".$dbh->errstr, 1);
	}
}

sub getTecCust {
	my %data = % { shift() };
	$getTecCust->execute($data{dateFrom}, $data{dateTo}, $data{user}, $data{level});
	my $table = &sqlToJson($getTecCust);
	print '{"error":0,"result":'.$table.'}';
}
sub getTechnicans {
	my %data = % { shift() };
	$getTechnicans->execute();
	my $table = &sqlToJson($getTechnicans);
	print '{"error":0,"result":'.$table.'}';
}
sub getProjects {
	my %data = % { shift() };
	$getProjects->execute($data{user}, $data{project});
	my $table = &sqlToJson($getProjects);
	print '{"error":0,"result":'.$table.'}';
}

sub getCustomers {
	my %data = % { shift() };
	$getCustomers->execute;
	my $table = &sqlToJson($getCustomers);
	print '{"error":0,"result":'.$table.'}';
}

sub login{
	my %data = % { shift() };
	if (defined $data{user} && defined $data{pass} && $data{pass} eq "" && cookie('token')) {
		$getToken->execute(cookie('token'));
		my $user;
		my $token;
		my $level;
		if(($token, $user, $level) = $getToken->fetchrow_array()){
			print header(-type => "application/json", -charset => "utf-8");
			print encode_json { error => 0,
				user => $user,
				token => $token,
				level => $level};
			return;
		} else {
			print header(-type => "application/json", -charset => "utf-8");
			if($data{user}) {
				&finalJsonMessage("Wrong Credentials", 2);
			} else {
				&finalJsonMessage("No matching session found", 1);
			}
		}
	}
	my $level = &ldapAuth ($data{user}, $data{pass});
	if (defined $data{user} && defined $data{pass} && $level){
		my $token;
		my $cookieKey;
		$token .= ("A".."Z", "a".."z", "0".."9")[rand 62] for 1..32;
		$cookieKey .= ("A".."Z", "a".."z", "0".."9")[rand 62] for 1..32;
		$createSession->execute($token, $cookieKey, $data{user}, $level);
		my $cookie = CGI::Cookie->new(-name => "token", -value=>$cookieKey, -secure=> 1, -httponly=>1, -expires=>"+2y");
		print header(-type => "application/json", -charset => "utf-8", -cookie => $cookie);
		print encode_json { error => 0,
					user => $data{user},
					token => $token,
					level => $level};
	} else {
		print header(-type => "application/json", -charset => "utf-8");
		&finalJsonMessage("Wrong credentials", 2);
	}
}
sub logout{
	my %data = % { shift() };
	$deleteSession->execute($data{token}); # unvalidated....
	&finalJsonMessage("logged out", 0);	
}
sub addDl {
	my %data = % { shift() };
	&finalJsonMessage("Bitte Kunde angeben", 2) if ($data{kunde} eq "");
	my $techniker = $data{user};
	if($data{level} >  1 && length($data{nameDl}) > 0) {
		$techniker = $data{nameDl};
	}
	$getKid->execute($data{kunde}, $data{kunde});
	if($data{ze} > 0 && $data{projekt} ne "") {
		if (my ($kid) = $getKid->fetchrow_array){
			if($addDl->execute($techniker, 
					$kid, 
					$data{timeDl},
					$data{ze}, 
					$data{user}, 
					$data{projekt}, 
					#CGI::escapeHTML($data{projekt}), 
					$data{anfahrt})) {
				&finalJsonMessage("DL added: ".$data{user}, 0);
			} else { 
				&finalJsonMessage($dbh->errstr, 2);
			}
		} else {
			&finalJsonMessage("Kunde nicht gefunden",3);
		}
	} else {
		&finalJsonMessage("Datensatz bitte vollständig eingeben", 2);
	}
}
sub updateDl {
	my %data = % { shift() };
	$data{field} =~ s/dlupdate-//g;
	&finalJsonMessage("Sorry, no", 2) if ($data{field} eq "status" && $data{level} < 2);
	$updateDl{$data{field}}->execute($data{value},
					$data{user},
					$data{id},
					$data{level},
					$data{user},
					$data{oldvalue});
	my $row = $updateDl{$data{field}}->rows;
	$getUpdatedDl{$data{field}}->execute($data{id},$data{level},$data{user});
	my ($newValue, $timeedit, $editor) = $getUpdatedDl{$data{field}}->fetchrow_array;
	if($row == 1) {
		if($data{field} eq "kunde" && $data{oldvalue} eq "dumm") { # update all & create new mapping
			$getOtrsShortName->execute($data{id});
			my ($otrsShort) = $getOtrsShortName->fetchrow_array;
			if ($otrsShort ne "") {
				$createDlOtrsRelation->execute($data{value}, $data{id});
				$updateDlOtrsEntries->execute($data{value}, $otrsShort);
			}
		}
	 	print encode_json {error => 0, 
				errormsg => "Datenpunkt $data{field} geändert. Eintragsid: $data{id}.",
				newvalue => $newValue,
				field => $data{field},
				editor => $editor,
				timeedit => $timeedit,
				id => $data{id}};
		exit;
	} elsif ($row == -1) {
		&finalJsonMessage("Fehler! Eintrag konnte nicht geändert werden!", 2);
	} elsif ($row == 0) {
		&finalJsonMessage("Fehler! Eintrag konnte nicht geändert werden - möglicherweise hat er sich zwischenzeitlich am Server geändert.", 2);
	} else {
		&finalJsonMessage("Fehler! $row Einträge geändert!", 2);
	}
}
sub getMyDl { # call getUserDl for the user himself
	my %data = % { shift() };
	&getUserDl(\%data);
}
sub getSpecificDl { # call getUserDl for a selected user
	my %data = % { shift() };
	# check permissions, maybe
	&getUserDl(\%data);
}
sub getUserDl {
	my %data = % { shift() };
	$getDl->execute($data{user}, 
			$data{level},
			$data{dateFrom}, 
			$data{dateTo}, 
			$data{dateFrom}, 
			$data{dateTo});
	my $table = &sqlToJson($getDl);
	print '{"error":0,"result":'.$table.'}';
}

sub sqlToJson {
	my $sqlQuery = shift();
	my @array;
	while (my $ref=$sqlQuery->fetchrow_hashref()) {
		push @array, $ref;
	}
	return  encode_json \@array;
}
sub getCustDl {
	my %data = % { shift() };
}

sub finalJsonMessage {
	my $error = shift;
	my $errorlevel = shift;
	print encode_json {error => $errorlevel, errormsg => $error};
	exit;
}

sub validate {
	my $token = shift();
	$checkSession->execute($token, cookie('token'));
	if (my ($name, $level) =  $checkSession->fetchrow_array) {
		return ($name, $level); 
	} else {
		&finalJsonMessage("invalid session", 2);
	}
}
sub ldapAuth {
	my ($user, $pass) = @_;
	if ($dev == 1) {
		if ($user =~ /admin/) {
			return 2;
		} elsif ($user =~ /user/) {
			return 1;
		}
	}
	&ldapAuthDo($user, $pass, $config{ldapgroupadmin}) && return 2;
	&ldapAuthDo($user, $pass, $config{ldapgroup}) && return 1;
	return 0;
}
sub ldapAuthDo {
	my ($user, $pass, $group) = @_;
	my $ldap = Authen::Simple::LDAP->new( 
		host	=> $config{ldaphost},
		basedn  => $config{ldapbasedn},
	filter  => '(&(memberof='.$group.')
			(objectClass=organizationalPerson)
			(objectClass=user)
			(sAMAccountName=%s))',
	binddn	=> $config{ldapauthuser},
	bindpw  => $config{ldapauthpass}
	);
	
	if ( $ldap->authenticate( $user, $pass ) ) {
		return 1;
		}
	else {
		return 0;
	}
}
