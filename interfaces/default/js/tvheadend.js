function parseJSON(strQuery, pCallback) {
	$(".spinner").show();

	$.getJSON(WEBDIR + "tvheadend/" + strQuery, function (pResult) {
		if (pCallback == null) {
			$(".spinner").hide();
			return;
		}

		pCallback(pResult);
		$(".spinner").hide();
	});
}

function convertTimestamp(nTimestamp) {
	var strDate = new Date(nTimestamp * 1000).toString();
	return strDate.substring(0, strDate.indexOf(' GMT')); // Strip GMT crap
}

function showEPG(pChannel) {
	parseJSON("GetEPG/300/" + pChannel.uuid, function(pResult) {
        var strTable = $("<table>").addClass("table table-striped table-hover").append(
			$("<tr>").append("<th>Name</th>")
				.append("<th>Start</th>")
				.append("<th>End</th>")
				.append("<th>Actions</th>")
			);

			$.each(pResult.entries, function(nIndex, pEntry) {
				strTable.append($("<tr>")
					.append($("<td>").text(pEntry.title))
					.append($("<td>").text(convertTimestamp(pEntry.start)))
					.append($("<td>").text(convertTimestamp(pEntry.stop)))
					.append($("<td>")
						.append($("<a>").text("REC").click(function(pEvent) {
							pEvent.preventDefault();
							parseJSON("DVRAdd/" + pEntry.eventId, null);
						}))
					));
			});

		showModal(pChannel.name, strTable,
			{
				/*'Watch' : function() {
					strTable.html("<video controls autoplay>"
						+ "<source src=\"http://192.168.1.11:9981/stream/channel/" + pChannel.uuid + "\"></source>"
						+ "</video>");
				}*/
			}
		);
	});
}

function getChannelTags() {
	parseJSON("GetChannelTags", function(pResult) {
		$.each(pResult.entries, function(nIndex, pEntry) {
			// Add nav tabs
			$(".nav.nav-tabs").append($("<li>")
				.append($("<a>")
					.attr("href", "#tag-" + pEntry.key)
					.attr("data-toggle", "tab")
						.text(pEntry.val)));

			// Add tab pane
			var strTabPane = $("<div>").attr("id", "tag-" + pEntry.key)
				.attr("class", "tab-pane");

			$(".tab-content").append(strTabPane.append($("<ul>").attr("id", "tag-" + pEntry.key + "-grid").attr("class", "thumbnails")));
		});
		getChannels();
	});

	$(window).trigger("hashchange");
}

function getChannels() {
	parseJSON("GetChannels", function(pResult) {

		$.each(pResult.entries, function(nIndex, pEntry) {

			$.each(pEntry.tags, function(nIndex, nTag) {

				var strHTML = null;

				var strHTML = $("<div>").attr("class", "channel");
				var pHTMLEntry = null;

				if (pEntry.icon != undefined) {
					pHTMLEntry = $("<img>").attr("src", pEntry.icon);
				}
				else {
					pHTMLEntry = $("<a>").text(pEntry.name);
				}

				pHTMLEntry.click(function (pEvent) {
					showEPG(pEntry);
				});
	
				strHTML.append(pHTMLEntry);

				$("#tag-" + nTag + "-grid").append($("<li>").append(strHTML));
			});
		});
	});
}

function parseRecordings(strType) {
	var strTable = $("<table>").attr("id", "recordings_" + strType)
		.attr("class", "recordingtable")
			.append($("<tr>")
				.append("<th>Channel</th>")
				.append("<th>Title</th>")
				.append("<th>Start</th>")
				.append("<th>End</th>")
				.append("<th>Status</th>")
				.append("<th>Actions</th>")
			);

	parseJSON("DVRList/" + strType, function(pResult) {
		$.each(pResult.entries, function(nIndex, pEntry) {
			strTable.append($("<tr>").attr("id", "recording-" + pEntry.uuid)
				.append($("<td>").text(pEntry.channelname))
				.append($("<td>").text(pEntry.disp_title))
				.append($("<td>").text(convertTimestamp(pEntry.start)))
				.append($("<td>").text(convertTimestamp(pEntry.stop)))
				.append($("<td>").text(pEntry.status))
				.append($("<td>").append($("<a>").text("DEL").click(function(pEvent) {
						pEvent.preventDefault();

						parseJSON("DVRDel/" + pEntry.uuid, function(pResult) {
							if (pResult.success == 1) {
								$("#recording-" + pEntry.uuid).fadeOut();
							}
						});
					})))
			);
		});
	});

	$("#recordings").append("<h2>" + strType.charAt(0).toUpperCase() + strType.slice(1) + " recordings</h2>")
		.append(strTable);
}

function getRecordings() {
	parseRecordings("upcoming");
	parseRecordings("finished");
}

$(document).ready(function () {
	getChannelTags();
	//getChannels();
	getRecordings();
});
